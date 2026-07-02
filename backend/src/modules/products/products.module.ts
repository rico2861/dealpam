import { Module } from '@nestjs/common';
import { ProductsService } from './products.service';
import { ProductsController } from './products.controller';
import { UploadModule } from '../upload/upload.module';
import { EventsModule } from '../events/events.module';

@Module({
  imports: [UploadModule, EventsModule],
  providers: [ProductsService],
  controllers: [ProductsController],
})
export class ProductsModule {}
