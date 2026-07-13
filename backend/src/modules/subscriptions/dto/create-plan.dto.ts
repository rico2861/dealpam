import { Transform } from 'class-transformer';
import { IsString, IsOptional, IsNumber, IsBoolean, IsIn, IsInt, Min, MaxLength } from 'class-validator';

export class CreatePlanDto {
  @IsIn(['STARTER', 'BUSINESS', 'PREMIUM', 'ELITE'])
  tier: string;

  @IsString() @MaxLength(60)
  name: string;

  @Transform(({ value }) => parseFloat(value))
  @IsNumber() @Min(0)
  priceHTG: number;

  @IsOptional() @Transform(({ value }) => (value != null ? parseInt(value, 10) : undefined))
  @IsInt() @Min(0)
  maxProducts?: number;

  @IsOptional() @Transform(({ value }) => (value != null ? parseInt(value, 10) : undefined))
  @IsInt() @Min(0)
  maxServices?: number;

  @IsOptional() @Transform(({ value }) => (value != null ? parseInt(value, 10) : undefined))
  @IsInt() @Min(1)
  maxImages?: number;

  @IsOptional() @Transform(({ value }) => (value != null ? parseInt(value, 10) : undefined))
  @IsInt() @Min(1)
  maxStores?: number;

  @IsOptional() @IsBoolean() hasVerifiedBadge?: boolean;
  @IsOptional() @IsBoolean() hasEliteBadge?: boolean;
  @IsOptional() @IsBoolean() hasPrioritySearch?: boolean;
  @IsOptional() @IsBoolean() hasHomepageAd?: boolean;
  @IsOptional() @IsBoolean() hasAdvancedStats?: boolean;
  @IsOptional() @IsBoolean() hasAutoSponsored?: boolean;
  @IsOptional() @IsBoolean() hasKeywordTargeting?: boolean;

  @IsOptional() @IsString() @MaxLength(500)
  description?: string;

  @IsOptional() @IsBoolean() isActive?: boolean;
  @IsOptional() @IsBoolean() isPopular?: boolean;

  @IsOptional() @Transform(({ value }) => (value != null ? parseFloat(value) : undefined))
  @IsNumber() @Min(0)
  originalPriceHTG?: number;

  @IsOptional() @Transform(({ value }) => (value != null ? parseInt(value, 10) : undefined))
  @IsInt() @Min(0)
  maxPromoProducts?: number;

  @IsOptional() @Transform(({ value }) => (value != null ? parseInt(value, 10) : undefined))
  @IsInt() @Min(0)
  maxCarouselProducts?: number;

  @IsOptional() @Transform(({ value }) => (value != null ? parseFloat(value) : undefined))
  @IsNumber() @Min(0)
  annualDiscountPercent?: number;
}
