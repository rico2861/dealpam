import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
type MessageType = 'TEXT' | 'IMAGE' | 'FILE' | 'BOT' | 'SYSTEM';

const AGENT_ROLES = ['ADMIN', 'SUPER_ADMIN', 'MODERATOR'];

const PARTICIPANT_SELECT = {
  include: {
    user: { select: { id: true, firstName: true, lastName: true, avatar: true, role: true } },
  },
};

@Injectable()
export class ChatService {
  constructor(private prisma: PrismaService) {}

  // ── User-to-user conversation ─────────────────────────────────────────────

  async getOrCreateConversation(userId: string, otherUserId: string) {
    const existing = await this.prisma.conversation.findFirst({
      where: {
        isSupport: false,
        AND: [
          { participants: { some: { userId } } },
          { participants: { some: { userId: otherUserId } } },
        ],
      },
      include: { participants: PARTICIPANT_SELECT, messages: { orderBy: { createdAt: 'desc' as const }, take: 1 } },
    });
    if (existing) return existing;

    return this.prisma.conversation.create({
      data: { isSupport: false, participants: { create: [{ userId }, { userId: otherUserId }] } },
      include: { participants: PARTICIPANT_SELECT, messages: { orderBy: { createdAt: 'desc' as const }, take: 1 } },
    });
  }

  // ── Support conversation ─────────────────────────────────────────────────

  async getOrCreateSupportConversation(userId: string, topic?: string) {
    // Return existing open support conv
    const existing = await this.prisma.conversation.findFirst({
      where: { isSupport: true, status: 'OPEN', participants: { some: { userId } } },
      include: { participants: PARTICIPANT_SELECT, messages: { orderBy: { createdAt: 'desc' as const }, take: 1 } },
    });
    if (existing) return existing;

    // Lookup user for welcome message
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, firstName: true, lastName: true },
    });

    // Create the base conversation first (no new fields — safe with any Prisma version)
    const conv = await this.prisma.conversation.create({
      data: {
        isSupport: true,
        topic: topic || 'general',
        status: 'OPEN',
        participants: { create: [{ userId }] },
      },
    });

    // Enrich with ticket + agent (non-critical — wrapped in try/catch)
    let agentName = 'notre équipe';
    try {
      const [ticketNumber, agent] = await Promise.all([
        this.generateTicketNumber(),
        this.findFreeAgent(),
      ]);
      const updates: any = { ticketNumber };
      if (agent) {
        updates.assignedAgentId = agent.id;
        agentName = `${agent.firstName} ${agent.lastName}`;
        await this.prisma.conversationUser.upsert({
          where: { conversationId_userId: { conversationId: conv.id, userId: agent.id } },
          create: { conversationId: conv.id, userId: agent.id },
          update: {},
        });
      }
      await this.prisma.conversation.update({ where: { id: conv.id }, data: updates as any });
    } catch { /* ticket/agent enrichment is non-critical */ }

    // Welcome message from Sophia (AI assistant)
    const firstName = user?.firstName ?? '';
    const greeting = firstName ? `Bonjour ${firstName} 👋` : 'Bonjour 👋';
    const welcome = `${greeting}\n\nJe suis **Sophia**, votre assistante IA DealPam. Je suis là pour répondre à vos questions, résoudre vos problèmes et vous accompagner à chaque étape.\n\n💬 Décrivez votre demande et je m'en occupe immédiatement.`;
    try { await this.sendBotMessage(conv.id, welcome); } catch { /* non-critical */ }

    return this.prisma.conversation.findUnique({
      where: { id: conv.id },
      include: { participants: PARTICIPANT_SELECT, messages: { orderBy: { createdAt: 'desc' as const }, take: 1 } },
    });
  }

  // ── Free agent selection ──────────────────────────────────────────────────

  async findFreeAgent() {
    const agents = await this.prisma.user.findMany({
      where: { role: { in: ['ADMIN', 'MODERATOR'] }, isActive: true },
      select: { id: true, firstName: true, lastName: true, avatar: true, role: true },
    });
    if (!agents.length) return null;

    // Find agent with fewest open support convs
    const loads = await Promise.all(
      agents.map(async a => ({
        agent: a,
        load: await this.prisma.conversation.count({
          where: { isSupport: true, status: 'OPEN' },
        }),
      })),
    );
    loads.sort((a, b) => a.load - b.load);
    return loads[0].agent;
  }

  // ── Ticket number ─────────────────────────────────────────────────────────

  private async generateTicketNumber(): Promise<string> {
    const count = await this.prisma.conversation.count({ where: { isSupport: true } });
    const year = new Date().getFullYear();
    const num = String(count + 1).padStart(5, '0');
    return `TKT-${year}-${num}`;
  }

  // ── Messages ──────────────────────────────────────────────────────────────

  async getUserConversations(userId: string) {
    return this.prisma.conversation.findMany({
      where: { participants: { some: { userId } } },
      include: { participants: PARTICIPANT_SELECT, messages: { orderBy: { createdAt: 'desc' as const }, take: 1 } },
      orderBy: { lastMessageAt: 'desc' },
    });
  }

  async getMessages(userId: string, conversationId: string, page = 1, limit = 40) {
    const conv = await this.prisma.conversation.findUnique({ where: { id: conversationId } });
    if (!conv) throw new NotFoundException('Conversation introuvable');

    const isParticipant = await this.prisma.conversationUser.findUnique({
      where: { conversationId_userId: { conversationId, userId } },
    });
    if (!isParticipant) {
      const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
      if (!AGENT_ROLES.includes(user?.role ?? '')) throw new ForbiddenException('Vous ne faites pas partie de cette conversation');
    }

    const [data, total] = await Promise.all([
      this.prisma.message.findMany({
        where: { conversationId },
        include: { sender: { select: { id: true, firstName: true, lastName: true, avatar: true, role: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.message.count({ where: { conversationId } }),
    ]);
    return { data: data.reverse(), total, page, totalPages: Math.ceil(total / limit) };
  }

  async sendMessage(senderId: string, conversationId: string, content: string, type: MessageType = 'TEXT', mediaUrl?: string) {
    const conv = await this.prisma.conversation.findUnique({ where: { id: conversationId } });
    if (!conv) throw new NotFoundException('Conversation introuvable');

    if ((conv as any).isSupport) {
      const isParticipant = await this.prisma.conversationUser.findUnique({
        where: { conversationId_userId: { conversationId, userId: senderId } },
      });
      if (!isParticipant) {
        const sender = await this.prisma.user.findUnique({ where: { id: senderId }, select: { role: true } });
        if (!AGENT_ROLES.includes(sender?.role ?? '')) throw new ForbiddenException('Accès refusé');
        await this.prisma.conversationUser.upsert({
          where: { conversationId_userId: { conversationId, userId: senderId } },
          create: { conversationId, userId: senderId },
          update: {},
        });
      }
    } else {
      await this.assertParticipant(senderId, conversationId);
    }

    const [message] = await this.prisma.$transaction([
      this.prisma.message.create({
        data: { conversationId, senderId, content, type, mediaUrl: mediaUrl || null },
        include: { sender: { select: { id: true, firstName: true, lastName: true, avatar: true, role: true } } },
      }),
      this.prisma.conversation.update({
        where: { id: conversationId },
        data: { lastMessage: content.slice(0, 100), lastMessageAt: new Date() },
      }),
      this.prisma.conversationUser.updateMany({
        where: { conversationId, NOT: { userId: senderId } },
        data: { unreadCount: { increment: 1 } },
      }),
    ]);

    return message;
  }

  // ── Bot / AI message ─────────────────────────────────────────────────────

  async sendBotMessage(conversationId: string, content: string): Promise<any> {
    let bot = await this.prisma.user.findFirst({ where: { email: 'ai@dealpam.com' } });
    if (!bot) {
      bot = await this.prisma.user.create({
        data: {
          email:        'ai@dealpam.com',
          username:     'dealpam_ai',
          firstName:    'DealPam',
          lastName:     'IA',
          role:         'MODERATOR',
          passwordHash: 'bot-account-no-login',
          isActive:     true,
        },
      });
    }

    const [message] = await this.prisma.$transaction([
      this.prisma.message.create({
        data: { conversationId, senderId: bot.id, content, type: 'BOT' },
        include: { sender: { select: { id: true, firstName: true, lastName: true, avatar: true, role: true } } },
      }),
      this.prisma.conversation.update({
        where: { id: conversationId },
        data: { lastMessage: content.slice(0, 100), lastMessageAt: new Date() },
      }),
    ]);
    return message;
  }

  // ── Escalate to human ─────────────────────────────────────────────────────

  async escalateToHuman(userId: string, conversationId: string) {
    await this.assertParticipant(userId, conversationId, true);
    const agent = await this.findFreeAgent();
    const updates: any = { topic: 'escalated', status: 'OPEN' };
    if (agent) {
      updates.assignedAgentId = agent.id;
      await this.prisma.conversationUser.upsert({
        where: { conversationId_userId: { conversationId, userId: agent.id } },
        create: { conversationId, userId: agent.id },
        update: {},
      });
    }
    await this.prisma.conversation.update({ where: { id: conversationId }, data: updates as any });

    const agentName = agent ? `${agent.firstName} ${agent.lastName}` : 'notre équipe';
    const content = `🙋 Connexion avec un agent humain — ${agentName} va vous rejoindre.`;
    const escalateMsg = await this.prisma.message.create({
      data: { conversationId, senderId: userId, content, type: 'SYSTEM' },
      include: { sender: { select: { id: true, firstName: true, lastName: true, avatar: true, role: true } } },
    });
    return { ...escalateMsg, assignedAgent: agent };
  }

  // ── Close conversation ────────────────────────────────────────────────────

  async closeConversation(conversationId: string, closedBy: string) {
    if (closedBy !== 'system') {
      await this.assertParticipant(closedBy, conversationId, true);
    }
    const content = '🔒 Conversation fermée.';
    await Promise.all([
      this.prisma.conversation.update({
        where: { id: conversationId },
        data: { status: 'CLOSED', closedAt: new Date() } as any,
      }),
      this.prisma.message.create({
        data: { conversationId, senderId: closedBy, content, type: 'SYSTEM' },
      }),
    ]);
    return { conversationId, status: 'CLOSED' };
  }

  // ── Auto-close stale support conversations (called from gateway cron) ─────

  async getStaleOpenConversations(olderThanMinutes = 10) {
    const cutoff = new Date(Date.now() - olderThanMinutes * 60 * 1000);
    return this.prisma.conversation.findMany({
      where: { isSupport: true, status: 'OPEN', lastMessageAt: { lt: cutoff } },
      select: { id: true },
    });
  }

  // ── Mark read ─────────────────────────────────────────────────────────────

  async markRead(userId: string, conversationId: string) {
    await this.prisma.conversationUser.updateMany({
      where: { conversationId, userId },
      data: { unreadCount: 0, lastSeenAt: new Date() },
    });
    await this.prisma.message.updateMany({
      where: { conversationId, isRead: false, NOT: { senderId: userId } },
      data: { isRead: true },
    });
  }

  // ── Admin: all conversations ──────────────────────────────────────────────

  async getAdminConversations(page = 1, limit = 30, supportOnly = false) {
    const where = supportOnly ? { isSupport: true } : {};
    const [data, total] = await Promise.all([
      this.prisma.conversation.findMany({
        where,
        include: { participants: PARTICIPANT_SELECT, messages: { orderBy: { createdAt: 'desc' as const }, take: 1 } },
        orderBy: { lastMessageAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.conversation.count({ where }),
    ]);
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async resolveConversation(conversationId: string, status: 'RESOLVED' | 'CLOSED' | 'OPEN') {
    return this.prisma.conversation.update({ where: { id: conversationId }, data: { status } });
  }

  // ── Unread count ──────────────────────────────────────────────────────────

  async getUnreadCount(userId: string) {
    const result = await this.prisma.conversationUser.aggregate({
      where: { userId },
      _sum: { unreadCount: true },
    });
    return result._sum.unreadCount ?? 0;
  }

  private async assertParticipant(userId: string, conversationId: string, allowAgents = false) {
    const p = await this.prisma.conversationUser.findUnique({
      where: { conversationId_userId: { conversationId, userId } },
    });
    if (p) return;
    if (allowAgents) {
      const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
      if (AGENT_ROLES.includes(user?.role ?? '')) return;
    }
    throw new ForbiddenException('Vous ne faites pas partie de cette conversation');
  }
}
