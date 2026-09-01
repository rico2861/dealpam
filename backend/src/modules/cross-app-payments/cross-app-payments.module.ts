import { Module } from '@nestjs/common';
import { CrossAppPaymentsService } from './cross-app-payments.service';
import { CrossAppPaymentsController } from './cross-app-payments.controller';

@Module({
  providers: [CrossAppPaymentsService],
  controllers: [CrossAppPaymentsController],
  exports: [CrossAppPaymentsService],
})
export class CrossAppPaymentsModule {}
