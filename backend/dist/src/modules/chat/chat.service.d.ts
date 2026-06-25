import { PrismaService } from '../../prisma/prisma.service';
import { MessageType } from '@prisma/client';
export declare class ChatService {
    private prisma;
    constructor(prisma: PrismaService);
    getOrCreateConversation(userId: string, otherUserId: string): Promise<{
        participants: ({
            user: {
                id: string;
                firstName: string;
                lastName: string;
                avatar: string;
            };
        } & {
            id: string;
            userId: string;
            conversationId: string;
            unreadCount: number;
            lastSeenAt: Date | null;
        })[];
        messages: {
            id: string;
            createdAt: Date;
            type: import(".prisma/client").$Enums.MessageType;
            isRead: boolean;
            conversationId: string;
            senderId: string;
            content: string;
            mediaUrl: string | null;
        }[];
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        lastMessage: string | null;
        lastMessageAt: Date | null;
    }>;
    getUserConversations(userId: string): Promise<({
        participants: ({
            user: {
                id: string;
                firstName: string;
                lastName: string;
                avatar: string;
            };
        } & {
            id: string;
            userId: string;
            conversationId: string;
            unreadCount: number;
            lastSeenAt: Date | null;
        })[];
        messages: {
            id: string;
            createdAt: Date;
            type: import(".prisma/client").$Enums.MessageType;
            isRead: boolean;
            conversationId: string;
            senderId: string;
            content: string;
            mediaUrl: string | null;
        }[];
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        lastMessage: string | null;
        lastMessageAt: Date | null;
    })[]>;
    getMessages(userId: string, conversationId: string, page?: number, limit?: number): Promise<{
        data: ({
            sender: {
                id: string;
                firstName: string;
                lastName: string;
                avatar: string;
            };
        } & {
            id: string;
            createdAt: Date;
            type: import(".prisma/client").$Enums.MessageType;
            isRead: boolean;
            conversationId: string;
            senderId: string;
            content: string;
            mediaUrl: string | null;
        })[];
        total: number;
        page: number;
        totalPages: number;
    }>;
    sendMessage(senderId: string, conversationId: string, content: string, type?: MessageType): Promise<{
        sender: {
            id: string;
            firstName: string;
            lastName: string;
            avatar: string;
        };
    } & {
        id: string;
        createdAt: Date;
        type: import(".prisma/client").$Enums.MessageType;
        isRead: boolean;
        conversationId: string;
        senderId: string;
        content: string;
        mediaUrl: string | null;
    }>;
    markRead(userId: string, conversationId: string): Promise<void>;
    private assertParticipant;
}
