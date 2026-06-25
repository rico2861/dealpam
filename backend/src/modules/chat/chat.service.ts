import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { MessageType } from '@prisma/client';

@Injectable()
export class ChatService {
  constructor(private prisma: PrismaService) {}

  // Get or create conversation between two users
  async getOrCreateConversation(userId: string, otherUserId: string) {
    // Find existing conversation between these two users
    const existing = await this.prisma.conversation.findFirst({
      where: {
        AND: [
          { participants: { some: { userId } } },
          { participants: { some: { userId: otherUserId } } },
        ],
      },
      include: {
        participants: { include: { user: { select: { id: true, firstName: true, lastName: true, avatar: true } } } },
        messages: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
    });

    if (existing) return existing;

    return this.prisma.conversation.create({
      data: {
        participants: {
          create: [{ userId }, { userId: otherUserId }],
        },
      },
      include: {
        participants: { include: { user: { select: { id: true, firstName: true, lastName: true, avatar: true } } } },
        messages: true,
      },
    });
  }

  async getUserConversations(userId: string) {
    return this.prisma.conversation.findMany({
      where: { participants: { some: { userId } } },
      include: {
        participants: { include: { user: { select: { id: true, firstName: true, lastName: true, avatar: true } } } },
        messages: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
      orderBy: { lastMessageAt: 'desc' },
    });
  }

  async getMessages(userId: string, conversationId: string, page = 1, limit = 30) {
    await this.assertParticipant(userId, conversationId);
    const [data, total] = await Promise.all([
      this.prisma.message.findMany({
        where: { conversationId },
        include: { sender: { select: { id: true, firstName: true, lastName: true, avatar: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.message.count({ where: { conversationId } }),
    ]);
    return { data: data.reverse(), total, page, totalPages: Math.ceil(total / limit) };
  }

  async sendMessage(senderId: string, conversationId: string, content: string, type: MessageType = MessageType.TEXT) {
    await this.assertParticipant(senderId, conversationId);

    const [message] = await this.prisma.$transaction([
      this.prisma.message.create({
        data: { conversationId, senderId, content, type },
        include: { sender: { select: { id: true, firstName: true, lastName: true, avatar: true } } },
      }),
      this.prisma.conversation.update({
        where: { id: conversationId },
        data: { lastMessage: content.slice(0, 100), lastMessageAt: new Date() },
      }),
      // Increment unread count for other participants
      this.prisma.conversationUser.updateMany({
        where: { conversationId, NOT: { userId: senderId } },
        data: { unreadCount: { increment: 1 } },
      }),
    ]);

    return message;
  }

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

  private async assertParticipant(userId: string, conversationId: string) {
    const participant = await this.prisma.conversationUser.findUnique({
      where: { conversationId_userId: { conversationId, userId } },
    });
    if (!participant) throw new ForbiddenException('Vous ne faites pas partie de cette conversation');
  }
}
