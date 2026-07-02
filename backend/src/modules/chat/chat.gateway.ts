import {
  WebSocketGateway, WebSocketServer, SubscribeMessage,
  MessageBody, ConnectedSocket, OnGatewayConnection, OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import { ChatService } from './chat.service';
import { AiChatService } from './ai-chat.service';

const ADMIN_ROLES = ['ADMIN', 'SUPER_ADMIN', 'MODERATOR'];

@WebSocketGateway({ cors: { origin: '*' }, namespace: '/chat' })
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;

  private online = new Map<string, string>(); // userId → socketId

  constructor(
    private chatService: ChatService,
    private aiChatService: AiChatService,
    private jwtService: JwtService,
    private prisma: PrismaService,
  ) {}

  async handleConnection(socket: Socket) {
    try {
      const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.replace('Bearer ', '');
      if (!token) return socket.disconnect();
      const payload = this.jwtService.verify(token, { secret: process.env.JWT_SECRET });
      socket.data.userId = payload.sub;
      socket.data.role = payload.role;
      socket.data.firstName = payload.firstName ?? '';
      socket.data.lastName = payload.lastName ?? '';

      this.online.set(payload.sub, socket.id);
      socket.join(`user:${payload.sub}`);
      this.server.emit('user:online', { userId: payload.sub });

      if (ADMIN_ROLES.includes(payload.role)) {
        socket.join('admin:monitor');
      }
    } catch {
      socket.disconnect();
    }
  }

  handleDisconnect(socket: Socket) {
    const userId = socket.data.userId;
    if (userId) {
      this.online.delete(userId);
      this.server.emit('user:offline', { userId });
    }
  }

  @SubscribeMessage('chat:join')
  async joinConversation(@ConnectedSocket() socket: Socket, @MessageBody() { conversationId }: { conversationId: string }) {
    const userId = socket.data.userId;
    const isAdmin = ADMIN_ROLES.includes(socket.data.role);

    if (!isAdmin) {
      const participant = await this.prisma.conversationUser.findUnique({
        where: { conversationId_userId: { conversationId, userId } },
      });
      if (!participant) return;
    }

    socket.join(`conv:${conversationId}`);
  }

  @SubscribeMessage('chat:send')
  async sendMessage(
    @ConnectedSocket() socket: Socket,
    @MessageBody() data: { conversationId: string; content: string; type?: string; mediaUrl?: string },
  ) {
    const msg = await this.chatService.sendMessage(
      socket.data.userId,
      data.conversationId,
      data.content,
      (data.type as any) || 'TEXT',
      data.mediaUrl,
    );

    this.server.to(`conv:${data.conversationId}`).emit('chat:message', msg);
    this.server.to('admin:monitor').emit('chat:message', { ...msg, conversationId: data.conversationId });

    // Trigger AI only for non-bot text messages on non-escalated support convs
    if (data.type !== 'BOT' && data.type !== 'SYSTEM') {
      const conv = await (this.prisma.conversation as any).findUnique({
        where: { id: data.conversationId },
        include: { participants: { include: { user: { select: { id: true, awayMessageEnabled: true, awayMessage: true } } } } },
      });
      if (conv?.isSupport && conv?.topic !== 'escalated') {
        this.triggerAiResponse(data.conversationId, data.content);
      } else if (conv && !conv.isSupport) {
        // p2p: check if other participant(s) have away message enabled and are offline
        this.triggerAwayMessages(conv, socket.data.userId);
      }
    }

    return msg;
  }

  @SubscribeMessage('chat:read')
  async markRead(@ConnectedSocket() socket: Socket, @MessageBody() { conversationId }: { conversationId: string }) {
    await this.chatService.markRead(socket.data.userId, conversationId);
    this.server.to(`conv:${conversationId}`).emit('chat:read', { conversationId, userId: socket.data.userId });
  }

  @SubscribeMessage('chat:typing')
  typingIndicator(@ConnectedSocket() socket: Socket, @MessageBody() { conversationId }: { conversationId: string }) {
    const userId = socket.data.userId;
    const role = socket.data.role;
    socket.to(`conv:${conversationId}`).emit('chat:typing', { userId, conversationId });

    // Alert other admins: this agent is actively writing in this ticket
    if (ADMIN_ROLES.includes(role)) {
      socket.to('admin:monitor').emit('agent:occupying', {
        agentId: userId,
        agentName: `${socket.data.firstName} ${socket.data.lastName}`.trim() || 'Agent',
        conversationId,
      });
    }
  }

  @SubscribeMessage('admin:reply')
  async adminReply(
    @ConnectedSocket() socket: Socket,
    @MessageBody() data: { conversationId: string; content: string; type?: string; mediaUrl?: string },
  ) {
    if (!ADMIN_ROLES.includes(socket.data.role)) return;
    const msg = await this.chatService.sendMessage(
      socket.data.userId,
      data.conversationId,
      data.content,
      (data.type as any) || 'TEXT',
      data.mediaUrl,
    );
    this.server.to(`conv:${data.conversationId}`).emit('chat:message', msg);
    this.server.to('admin:monitor').emit('chat:message', { ...msg, conversationId: data.conversationId });
    return msg;
  }

  isOnline(userId: string): boolean {
    return this.online.has(userId);
  }

  // ── Auto-close inactive support conversations (every 5 minutes) ────────────

  @Cron('*/5 * * * *')
  async closeInactiveSupportConversations() {
    if (!this.server) return;
    try {
      const stale = await this.chatService.getStaleOpenConversations(10);
      for (const conv of stale) {
        await this.chatService.closeConversation(conv.id, 'system');
        this.server.to(`conv:${conv.id}`).emit('chat:closed', {
          conversationId: conv.id,
          reason: 'inactivity',
          message: 'Conversation fermée automatiquement après 10 minutes d\'inactivité.',
        });
      }
    } catch { /* ignore */ }
  }

  // ── Away-message auto-reply for p2p conversations ─────────────────────────

  private triggerAwayMessages(conv: any, senderId: string) {
    (async () => {
      try {
        const others = (conv.participants ?? []).filter((p: any) => p.userId !== senderId);
        for (const part of others) {
          const u = part.user;
          if (!u) continue;
          if (this.online.has(u.id)) continue; // skip if online
          if (!u.awayMessageEnabled || !u.awayMessage) continue;
          // Throttle: only send once per 30 min per conversation
          const thirtyMinAgo = new Date(Date.now() - 30 * 60 * 1000);
          const recentAway = await this.prisma.message.findFirst({
            where: {
              conversationId: conv.id,
              senderId: u.id,
              type: 'BOT',
              createdAt: { gt: thirtyMinAgo },
            },
          });
          if (recentAway) continue;
          await this.delay(1000);
          const away = await this.prisma.message.create({
            data: { conversationId: conv.id, senderId: u.id, content: u.awayMessage, type: 'BOT' },
            include: { sender: { select: { id: true, firstName: true, lastName: true, avatar: true, role: true } } },
          });
          this.server.to(`conv:${conv.id}`).emit('chat:message', away);
        }
      } catch { /* ignore */ }
    })();
  }

  // ── AI auto-response ────────────────────────────────────────────────────────

  private triggerAiResponse(conversationId: string, userMessage: string) {
    (async () => {
      try {
        await this.delay(800);
        this.server.to(`conv:${conversationId}`).emit('chat:typing', { userId: 'bot', conversationId });
        const history = await this.getConversationHistory(conversationId);
        await this.delay(1200);
        const aiContent = await this.aiChatService.respond(userMessage, history);
        const botMsg = await this.chatService.sendBotMessage(conversationId, aiContent);
        this.server.to(`conv:${conversationId}`).emit('chat:message', botMsg);
        this.server.to('admin:monitor').emit('chat:message', { ...botMsg, conversationId });
      } catch { /* silently ignore */ }
    })();
  }

  private async getConversationHistory(conversationId: string) {
    const msgs = await this.prisma.message.findMany({
      where: { conversationId, type: { in: ['TEXT', 'BOT'] } },
      orderBy: { createdAt: 'desc' },
      take: 6,
      include: { sender: { select: { role: true } } },
    });
    return msgs.reverse().map(m => ({
      role: (m.type === 'BOT' ? 'assistant' : 'user') as 'user' | 'assistant',
      content: m.content,
    }));
  }

  private delay(ms: number) {
    return new Promise(r => setTimeout(r, ms));
  }
}
