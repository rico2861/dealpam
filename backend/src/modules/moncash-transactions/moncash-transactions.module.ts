import { Module } from '@nestjs/common';
import { PrismaModule }  from '../../prisma/prisma.module';
import { MoncashModule } from '../moncash/moncash.module';
import { MoncashTransactionsService }    from './moncash-transactions.service';
import { MoncashTransactionsController } from './moncash-transactions.controller';

@Module({
  imports: [PrismaModule, MoncashModule],
  controllers: [MoncashTransactionsController],
  providers: [MoncashTransactionsService],
  exports: [MoncashTransactionsService],
})
export class MoncashTransactionsModule {}
