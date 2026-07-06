import { IsOptional, IsString, IsNumber, IsBoolean, Min, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type, Transform } from 'class-transformer';

export class FilterProductsDto {
  @IsOptional() @IsString() category?: string;
  @IsOptional() @IsString() categorySlug?: string; // alias for category
  @IsOptional() @IsString() brand?: string;
  @IsOptional() @Type(() => Number) @IsNumber() minPrice?: number;
  @IsOptional() @Type(() => Number) @IsNumber() maxPrice?: number;
  @IsOptional() @IsString() search?: string;
  @IsOptional() @IsString() storeId?: string;
  @IsOptional() @IsString() productType?: string;
  @IsOptional() @IsString() sort?: string;
  @IsOptional() @Transform(({ value }) => value === 'true' || value === true) @IsBoolean() inStock?: boolean;
  @IsOptional() @IsString() department?: string;
  @IsOptional() @IsString() city?: string;
  @IsOptional() @Transform(({ value }) => value === 'true' || value === true) @IsBoolean() featured?: boolean;
  @IsOptional() @Transform(({ value }) => value === 'true' || value === true) @IsBoolean() sponsored?: boolean;
  @IsOptional() @Transform(({ value }) => value === 'true' || value === true) @IsBoolean() hasSale?: boolean;
  @IsOptional() @Transform(({ value }) => value === 'true' || value === true) @IsBoolean() storeVerified?: boolean;
  @IsOptional() @Type(() => Number) @IsNumber() minRating?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(1) page?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(1) @Max(100) limit?: number;
}
