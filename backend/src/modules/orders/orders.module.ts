import { Module } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { OrdersCron } from './orders.cron';
import { PrismaModule } from '../../prisma/prisma.module';
import { MailModule } from '../mail/mail.module';
import { CouponsModule } from '../coupons/coupons.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports:     [PrismaModule, MailModule, CouponsModule, NotificationsModule],
  providers:   [OrdersService, OrdersCron],
  controllers: [OrdersController],
  exports:     [OrdersService],
})
export class OrdersModule {}
