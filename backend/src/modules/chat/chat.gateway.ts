import {
  WebSocketGateway, WebSocketServer, SubscribeMessage,
  MessageBody, ConnectedSocket, OnGatewayConnection, OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { ChatService } from './chat.service';

@WebSocketGateway({ cors: { origin: '*' }, namespace: '/chat' })
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;

  private online = new Map<string, string>(); // userId → socketId

  constructor(private chatService: ChatService, private jwtService: JwtService) {}

  async handleConnection(socket: Socket) {
    try {
      const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.replace('Bearer ', '');
      if (!token) return socket.disconnect();
      const payload = this.jwtService.verify(token, { secret: process.env.JWT_SECRET });
      socket.data.userId = payload.sub;
      this.online.set(payload.sub, socket.id);
      socket.join(`user:${payload.sub}`);
      this.server.emit('user:online', { userId: payload.sub });
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
  joinConversation(@ConnectedSocket() socket: Socket, @MessageBody() { conversationId }: { conversationId: string }) {
    socket.join(`conv:${conversationId}`);
  }

  @SubscribeMessage('chat:send')
  async sendMessage(@ConnectedSocket() socket: Socket, @MessageBody() data: { conversationId: string; content: string; type?: string }) {
    const msg = await this.chatService.sendMessage(socket.data.userId, data.conversationId, data.content, data.type as any || 'TEXT');
    this.server.to(`conv:${data.conversationId}`).emit('chat:message', msg);
    return msg;
  }

  @SubscribeMessage('chat:read')
  async markRead(@ConnectedSocket() socket: Socket, @MessageBody() { conversationId }: { conversationId: string }) {
    await this.chatService.markRead(socket.data.userId, conversationId);
    this.server.to(`conv:${conversationId}`).emit('chat:read', { conversationId, userId: socket.data.userId });
  }

  @SubscribeMessage('chat:typing')
  typingIndicator(@ConnectedSocket() socket: Socket, @MessageBody() { conversationId }: { conversationId: string }) {
    socket.to(`conv:${conversationId}`).emit('chat:typing', { userId: socket.data.userId, conversationId });
  }

  isOnline(userId: string): boolean {
    return this.online.has(userId);
  }
}
