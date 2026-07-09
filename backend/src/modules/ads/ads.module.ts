import { Module } from '@nestjs/common';
import { AdsController } from './ads.controller';
import { AdsService } from './ads.service';
import { AdsCron } from './ads.cron';
import { PrismaModule } from '../../prisma/prisma.module';
import { WalletModule } from '../wallet/wallet.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [PrismaModule, WalletModule, NotificationsModule],
  controllers: [AdsController],
  providers: [AdsService, AdsCron],
  exports: [AdsService],
})
export class AdsModule {}
