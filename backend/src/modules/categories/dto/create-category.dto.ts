import { IsString, IsOptional, IsBoolean, IsInt, MaxLength } from 'class-validator';

export class CreateCategoryDto {
  @IsString() @MaxLength(60)
  name: string;

  @IsString() @MaxLength(60)
  slug: string;

  @IsOptional() @IsString()
  imageUrl?: string;

  @IsOptional() @IsString() @MaxLength(20)
  icon?: string;

  @IsOptional() @IsString()
  parentId?: string;

  @IsOptional() @IsInt()
  sortOrder?: number;

  @IsOptional() @IsBoolean()
  isActive?: boolean;
}
