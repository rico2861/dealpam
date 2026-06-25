import { Controller, Get, Post, Body, Param, Query, UseGuards, Req, ParseIntPipe, DefaultValuePipe } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
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

  @Post('conversations/:id/read')
  @ApiOperation({ summary: 'Marquer les messages comme lus' })
  markRead(@Req() req: any, @Param('id') conversationId: string) {
    return this.chatService.markRead(req.user.id, conversationId);
  }
}
