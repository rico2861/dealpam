import { Module } from '@nestjs/common';
import { SubscriptionsService } from './subscriptions.service';
import { SubscriptionsController } from './subscriptions.controller';
import { SubscriptionCron } from './subscription.cron';

@Module({
  providers: [SubscriptionsService, SubscriptionCron],
  controllers: [SubscriptionsController],
  exports: [SubscriptionCron, SubscriptionsService],
})
export class SubscriptionsModule {}
