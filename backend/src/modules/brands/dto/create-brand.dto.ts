import { IsString, IsOptional, IsBoolean, MaxLength } from 'class-validator';

export class CreateBrandDto {
  @IsString() @MaxLength(60)
  name: string;

  @IsOptional() @IsString()
  logoUrl?: string;

  @IsOptional() @IsBoolean()
  isActive?: boolean;
}
