import { Transform } from 'class-transformer';
import { IsString, IsOptional, IsNumber, IsBoolean, IsIn, IsInt, Min, MaxLength, IsDateString } from 'class-validator';

export class CreateCouponDto {
  @IsString() @MaxLength(40)
  code: string;

  @IsOptional() @IsString() @MaxLength(200)
  description?: string;

  @IsIn(['PERCENTAGE', 'FIXED_AMOUNT'])
  discountType: string;

  @Transform(({ value }) => parseFloat(value))
  @IsNumber() @Min(0)
  discountValue: number;

  @IsOptional() @IsIn(['SUBSCRIPTION', 'PLATFORM_PRODUCT', 'BOTH'])
  appliesTo?: string;

  @IsOptional() @Transform(({ value }) => (value != null ? parseFloat(value) : undefined))
  @IsNumber() @Min(0)
  minAmountHTG?: number;

  @IsOptional() @Transform(({ value }) => (value != null ? parseFloat(value) : undefined))
  @IsNumber() @Min(0)
  maxDiscountHTG?: number;

  @IsOptional() @Transform(({ value }) => (value != null ? parseInt(value, 10) : undefined))
  @IsInt() @Min(1)
  maxUses?: number;

  @IsOptional() @Transform(({ value }) => (value != null ? parseInt(value, 10) : undefined))
  @IsInt() @Min(1)
  maxUsesPerUser?: number;

  @IsOptional() @IsDateString()
  startsAt?: string;

  @IsOptional() @IsDateString()
  endsAt?: string;

  @IsOptional() @IsBoolean()
  isActive?: boolean;
}
