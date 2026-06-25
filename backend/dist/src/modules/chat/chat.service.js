"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
const client_1 = require("@prisma/client");
let ChatService = class ChatService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getOrCreateConversation(userId, otherUserId) {
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
        if (existing)
            return existing;
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
    async getUserConversations(userId) {
        return this.prisma.conversation.findMany({
            where: { participants: { some: { userId } } },
            include: {
                participants: { include: { user: { select: { id: true, firstName: true, lastName: true, avatar: true } } } },
                messages: { orderBy: { createdAt: 'desc' }, take: 1 },
            },
            orderBy: { lastMessageAt: 'desc' },
        });
    }
    async getMessages(userId, conversationId, page = 1, limit = 30) {
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
    async sendMessage(senderId, conversationId, content, type = client_1.MessageType.TEXT) {
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
            this.prisma.conversationUser.updateMany({
                where: { conversationId, NOT: { userId: senderId } },
                data: { unreadCount: { increment: 1 } },
            }),
        ]);
        return message;
    }
    async markRead(userId, conversationId) {
        await this.prisma.conversationUser.updateMany({
            where: { conversationId, userId },
            data: { unreadCount: 0, lastSeenAt: new Date() },
        });
        await this.prisma.message.updateMany({
            where: { conversationId, isRead: false, NOT: { senderId: userId } },
            data: { isRead: true },
        });
    }
    async assertParticipant(userId, conversationId) {
        const participant = await this.prisma.conversationUser.findUnique({
            where: { conversationId_userId: { conversationId, userId } },
        });
        if (!participant)
            throw new common_1.ForbiddenException('Vous ne faites pas partie de cette conversation');
    }
};
exports.ChatService = ChatService;
exports.ChatService = ChatService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], ChatService);
//# sourceMappingURL=chat.service.js.map