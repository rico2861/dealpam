import { Module } from '@nestjs/common';
import { CrossPlatformService } from './cross-platform.service';
import { CrossPlatformController } from './cross-platform.controller';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [CrossPlatformService],
  controllers: [CrossPlatformController],
  exports: [CrossPlatformService],
})
export class CrossPlatformModule {}
