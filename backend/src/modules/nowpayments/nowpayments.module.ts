import { Module, Global } from '@nestjs/common';
import { NowPaymentsService } from './nowpayments.service';

@Global()
@Module({
  providers: [NowPaymentsService],
  exports: [NowPaymentsService],
})
export class NowPaymentsModule {}
