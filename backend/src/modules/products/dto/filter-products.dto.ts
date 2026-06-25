import { IsOptional, IsString, IsNumber, IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type, Transform } from 'class-transformer';

export class FilterProductsDto {
  @IsOptional() @IsString() category?: string;
  @IsOptional() @IsString() brand?: string;
  @IsOptional() @Type(() => Number) @IsNumber() minPrice?: number;
  @IsOptional() @Type(() => Number) @IsNumber() maxPrice?: number;
  @IsOptional() @IsString() search?: string;
  @IsOptional() @IsString() storeId?: string;
  @IsOptional() @IsString() sort?: string;
  @IsOptional() @Transform(({ value }) => value === 'true') @IsBoolean() inStock?: boolean;
  @IsOptional() @IsString() department?: string;
  @IsOptional() @Transform(({ value }) => value === 'true') @IsBoolean() featured?: boolean;
  @IsOptional() @Transform(({ value }) => value === 'true') @IsBoolean() sponsored?: boolean;
  @IsOptional() @Type(() => Number) @IsNumber() minRating?: number;
  @IsOptional() @Type(() => Number) @IsNumber() page?: number;
  @IsOptional() @Type(() => Number) @IsNumber() limit?: number;
}
