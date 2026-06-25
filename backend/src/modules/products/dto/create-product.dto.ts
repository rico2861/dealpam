import { IsString, IsNumber, IsOptional, IsArray, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateProductDto {
  @ApiProperty() @IsString() name: string;
  @ApiProperty() @IsString() description: string;
  @ApiProperty() @IsString() categoryId: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() brandId?: string;
  @ApiProperty() @Type(() => Number) @IsNumber() price: number;
  @ApiProperty({ required: false }) @IsOptional() @Type(() => Number) @IsNumber() salePrice?: number;
  @ApiProperty({ required: false }) @IsOptional() @Type(() => Number) @IsNumber() @Min(0) stock?: number;
  @ApiProperty({ required: false }) @IsOptional() @IsString() sku?: string;
  @ApiProperty({ required: false, type: [String] }) @IsOptional() @IsArray() sizes?: string[];
  @ApiProperty({ required: false, type: [String] }) @IsOptional() @IsArray() colors?: string[];
}
