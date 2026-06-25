import { Module } from '@nestjs/common';
import { PaymentsService }    from './payments.service';
import { PaymentsController } from './payments.controller';
import { MoncashModule }      from '../moncash/moncash.module';
import { PrismaModule }       from '../../prisma/prisma.module';

@Module({
  imports:     [PrismaModule, MoncashModule],
  providers:   [PaymentsService],
  controllers: [PaymentsController],
  exports:     [PaymentsService],
})
export class PaymentsModule {}
