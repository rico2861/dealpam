import { Module } from '@nestjs/common';
import { WalletController } from './wallet.controller';
import { WalletService } from './wallet.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { MoncashModule } from '../moncash/moncash.module';
import { MoncashTransactionsModule } from '../moncash-transactions/moncash-transactions.module';

@Module({
  imports: [PrismaModule, MoncashModule, MoncashTransactionsModule],
  controllers: [WalletController],
  providers: [WalletService],
  exports: [WalletService],
})
export class WalletModule {}
