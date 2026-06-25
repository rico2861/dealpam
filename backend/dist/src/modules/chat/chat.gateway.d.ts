import { OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { ChatService } from './chat.service';
export declare class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
    private chatService;
    private jwtService;
    server: Server;
    private online;
    constructor(chatService: ChatService, jwtService: JwtService);
    handleConnection(socket: Socket): Promise<Socket<import("socket.io").DefaultEventsMap, import("socket.io").DefaultEventsMap, import("socket.io").DefaultEventsMap, any>>;
    handleDisconnect(socket: Socket): void;
    joinConversation(socket: Socket, { conversationId }: {
        conversationId: string;
    }): void;
    sendMessage(socket: Socket, data: {
        conversationId: string;
        content: string;
        type?: string;
    }): Promise<{
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
    markRead(socket: Socket, { conversationId }: {
        conversationId: string;
    }): Promise<void>;
    typingIndicator(socket: Socket, { conversationId }: {
        conversationId: string;
    }): void;
    isOnline(userId: string): boolean;
}
