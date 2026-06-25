import { IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class InitiatePaymentDto {
  @ApiProperty({ description: 'ID de la commande à payer' })
  @IsUUID()
  orderId: string;
}
