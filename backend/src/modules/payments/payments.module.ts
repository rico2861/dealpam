import { Module } from '@nestjs/common';
import { PaymentsService }    from './payments.service';
import { PaymentsController } from './payments.controller';
import { MoncashModule }      from '../moncash/moncash.module';
import { MoncashTransactionsModule } from '../moncash-transactions/moncash-transactions.module';
import { PrismaModule }       from '../../prisma/prisma.module';
import { CouponsModule }      from '../coupons/coupons.module';

@Module({
  imports:     [PrismaModule, MoncashModule, MoncashTransactionsModule, CouponsModule],
  providers:   [PaymentsService],
  controllers: [PaymentsController],
  exports:     [PaymentsService],
})
export class PaymentsModule {}
