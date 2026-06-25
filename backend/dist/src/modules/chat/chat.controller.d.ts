import { ChatService } from './chat.service';
export declare class ChatController {
    private chatService;
    constructor(chatService: ChatService);
    getConversations(req: any): Promise<({
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
    getOrCreate(req: any, otherUserId: string): Promise<{
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
    getMessages(req: any, conversationId: string, page: number): Promise<{
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
    markRead(req: any, conversationId: string): Promise<void>;
}
