import { Controller, Get, Post, Body, Param, Query, UseGuards, Req, ParseIntPipe, DefaultValuePipe } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { RolesGuard } from '../../shared/guards/roles.guard';
import { Roles } from '../../shared/decorators/roles.decorator';
import { ChatService } from './chat.service';

@ApiTags('Chat')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('chat')
export class ChatController {
  constructor(private chatService: ChatService) {}

  @Get('conversations')
  @ApiOperation({ summary: 'Mes conversations' })
  getConversations(@Req() req: any) {
    return this.chatService.getUserConversations(req.user.id);
  }

  @Get('unread-count')
  @ApiOperation({ summary: 'Total de messages non lus (acheteur, vendeur ou admin)' })
  getUnreadCount(@Req() req: any) {
    return this.chatService.getUnreadCount(req.user.id);
  }

  @Post('support')
  @ApiOperation({ summary: 'Démarrer ou récupérer la conversation support (Sophia / agent)' })
  getOrCreateSupport(@Req() req: any, @Body('topic') topic?: string) {
    return this.chatService.getOrCreateSupportConversation(req.user.id, topic);
  }

  @Post('conversations/:id/escalate')
  @ApiOperation({ summary: 'Escalader la conversation vers un agent humain' })
  escalate(@Req() req: any, @Param('id') conversationId: string) {
    return this.chatService.escalateToHuman(req.user.id, conversationId);
  }

  @Post('conversations/:id/close')
  @ApiOperation({ summary: 'Fermer la conversation' })
  close(@Req() req: any, @Param('id') conversationId: string) {
    return this.chatService.closeConversation(conversationId, req.user.id);
  }

  @Post('conversations')
  @ApiOperation({ summary: 'Démarrer ou récupérer une conversation avec un utilisateur' })
  getOrCreate(@Req() req: any, @Body('userId') otherUserId: string) {
    return this.chatService.getOrCreateConversation(req.user.id, otherUserId);
  }

  @Get('conversations/:id/messages')
  @ApiOperation({ summary: 'Messages d\'une conversation (paginés)' })
  getMessages(
    @Req() req: any,
    @Param('id') conversationId: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
  ) {
    return this.chatService.getMessages(req.user.id, conversationId, page);
  }

  @Post('conversations/:id/messages')
  @ApiOperation({ summary: 'Envoyer un message dans une conversation (texte, image ou fichier)' })
  sendMessage(
    @Req() req: any,
    @Param('id') conversationId: string,
    @Body('content') content: string,
    @Body('type') type?: 'TEXT' | 'IMAGE' | 'FILE',
    @Body('mediaUrl') mediaUrl?: string,
  ) {
    return this.chatService.sendMessage(req.user.id, conversationId, content, type || 'TEXT', mediaUrl);
  }

  @Post('conversations/:id/read')
  @ApiOperation({ summary: 'Marquer les messages comme lus' })
  markRead(@Req() req: any, @Param('id') conversationId: string) {
    return this.chatService.markRead(req.user.id, conversationId);
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  ADMIN — Moniteur de conversations
  // ══════════════════════════════════════════════════════════════════════════

  @Get('admin/conversations')
  @UseGuards(RolesGuard) @Roles('ADMIN', 'SUPER_ADMIN', 'MODERATOR')
  @ApiOperation({ summary: 'Admin — liste toutes les conversations (filtrable par période/recherche)' })
  getAdminConversations(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(30), ParseIntPipe) limit: number,
    @Query('supportOnly') supportOnly?: string,
    @Query('search') search?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    return this.chatService.getAdminConversations(page, limit, supportOnly === 'true', search, dateFrom, dateTo);
  }

  @Post('admin/conversations/:id/status')
  @UseGuards(RolesGuard) @Roles('ADMIN', 'SUPER_ADMIN', 'MODERATOR')
  @ApiOperation({ summary: 'Admin — change le statut d\'une conversation (OPEN/RESOLVED/CLOSED)' })
  setConversationStatus(@Param('id') conversationId: string, @Body('status') status: 'OPEN' | 'RESOLVED' | 'CLOSED') {
    return this.chatService.resolveConversation(conversationId, status);
  }

  @Get('admin/unread-count')
  @UseGuards(RolesGuard) @Roles('ADMIN', 'SUPER_ADMIN', 'MODERATOR')
  @ApiOperation({ summary: 'Admin — nombre de conversations support ouvertes (badge de notification)' })
  getAdminUnreadCount() {
    return this.chatService.getAdminUnreadCount();
  }
}
