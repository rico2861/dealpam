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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatGateway = void 0;
const websockets_1 = require("@nestjs/websockets");
const socket_io_1 = require("socket.io");
const jwt_1 = require("@nestjs/jwt");
const chat_service_1 = require("./chat.service");
let ChatGateway = class ChatGateway {
    constructor(chatService, jwtService) {
        this.chatService = chatService;
        this.jwtService = jwtService;
        this.online = new Map();
    }
    async handleConnection(socket) {
        try {
            const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.replace('Bearer ', '');
            if (!token)
                return socket.disconnect();
            const payload = this.jwtService.verify(token, { secret: process.env.JWT_SECRET });
            socket.data.userId = payload.sub;
            this.online.set(payload.sub, socket.id);
            socket.join(`user:${payload.sub}`);
            this.server.emit('user:online', { userId: payload.sub });
        }
        catch {
            socket.disconnect();
        }
    }
    handleDisconnect(socket) {
        const userId = socket.data.userId;
        if (userId) {
            this.online.delete(userId);
            this.server.emit('user:offline', { userId });
        }
    }
    joinConversation(socket, { conversationId }) {
        socket.join(`conv:${conversationId}`);
    }
    async sendMessage(socket, data) {
        const msg = await this.chatService.sendMessage(socket.data.userId, data.conversationId, data.content, data.type || 'TEXT');
        this.server.to(`conv:${data.conversationId}`).emit('chat:message', msg);
        return msg;
    }
    async markRead(socket, { conversationId }) {
        await this.chatService.markRead(socket.data.userId, conversationId);
        this.server.to(`conv:${conversationId}`).emit('chat:read', { conversationId, userId: socket.data.userId });
    }
    typingIndicator(socket, { conversationId }) {
        socket.to(`conv:${conversationId}`).emit('chat:typing', { userId: socket.data.userId, conversationId });
    }
    isOnline(userId) {
        return this.online.has(userId);
    }
};
exports.ChatGateway = ChatGateway;
__decorate([
    (0, websockets_1.WebSocketServer)(),
    __metadata("design:type", socket_io_1.Server)
], ChatGateway.prototype, "server", void 0);
__decorate([
    (0, websockets_1.SubscribeMessage)('chat:join'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket, Object]),
    __metadata("design:returntype", void 0)
], ChatGateway.prototype, "joinConversation", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('chat:send'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket, Object]),
    __metadata("design:returntype", Promise)
], ChatGateway.prototype, "sendMessage", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('chat:read'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket, Object]),
    __metadata("design:returntype", Promise)
], ChatGateway.prototype, "markRead", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('chat:typing'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket, Object]),
    __metadata("design:returntype", void 0)
], ChatGateway.prototype, "typingIndicator", null);
exports.ChatGateway = ChatGateway = __decorate([
    (0, websockets_1.WebSocketGateway)({ cors: { origin: '*' }, namespace: '/chat' }),
    __metadata("design:paramtypes", [chat_service_1.ChatService, jwt_1.JwtService])
], ChatGateway);
//# sourceMappingURL=chat.gateway.js.map