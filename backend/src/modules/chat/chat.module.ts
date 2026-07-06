import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ChatGateway } from './chat.gateway';
import { ChatService } from './chat.service';
import { ChatController } from './chat.controller';
import { AiChatService } from './ai-chat.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { UploadModule } from '../upload/upload.module';

@Module({
  imports: [
    JwtModule.register({ secret: process.env.JWT_SECRET }),
    PrismaModule,
    UploadModule,
  ],
  providers: [ChatGateway, ChatService, AiChatService],
  controllers: [ChatController],
  exports: [ChatService],
})
export class ChatModule {}
