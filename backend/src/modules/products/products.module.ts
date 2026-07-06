import { Module } from '@nestjs/common';
import { ProductsService } from './products.service';
import { ProductsController } from './products.controller';
import { UploadModule } from '../upload/upload.module';
import { EventsModule } from '../events/events.module';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';

@Module({
  imports: [UploadModule, EventsModule, SubscriptionsModule],
  providers: [ProductsService],
  controllers: [ProductsController],
})
export class ProductsModule {}
