import { IsString, IsNumber, IsOptional, IsArray, Min, Max, MinLength, MaxLength, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateProductDto {
  @ApiProperty() @IsString() @MinLength(2) @MaxLength(200) name: string;
  @ApiProperty() @IsString() @MinLength(10) @MaxLength(5000) description: string;
  @ApiProperty() @IsUUID() categoryId: string;
  @ApiProperty({ required: false }) @IsOptional() @IsUUID() brandId?: string;
  @ApiProperty() @Type(() => Number) @IsNumber() @Min(0) @Max(9999999) price: number;
  @ApiProperty({ required: false }) @IsOptional() @Type(() => Number) @IsNumber() @Min(0) @Max(9999999) salePrice?: number;
  @ApiProperty({ required: false }) @IsOptional() @Type(() => Number) @IsNumber() @Min(0) @Max(99999) stock?: number;
  @ApiProperty({ required: false }) @IsOptional() @IsString() @MaxLength(100) sku?: string;
  @ApiProperty({ required: false, type: [String] }) @IsOptional() @IsArray() sizes?: string[];
  @ApiProperty({ required: false, type: [String] }) @IsOptional() @IsArray() colors?: string[];
}
