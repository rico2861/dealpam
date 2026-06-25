import { IsString, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class VerifyPaymentDto {
  @ApiProperty({ description: 'transactionId retourné par MonCash dans l\'URL de retour', required: false })
  @IsOptional()
  @IsString()
  transaction_id?: string;

  @ApiProperty({ description: 'orderId interne (fallback)', required: false })
  @IsOptional()
  @IsString()
  order_id?: string;
}
