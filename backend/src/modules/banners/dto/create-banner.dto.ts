import { Transform } from 'class-transformer';
import { IsString, IsOptional, IsInt, IsIn, MaxLength, IsDateString } from 'class-validator';

export class CreateBannerDto {
  @IsOptional() @IsIn(['HERO', 'SIDE_LEFT', 'SIDE_RIGHT'])
  position?: string;

  @IsOptional() @IsString() @MaxLength(40)
  tag?: string;

  @IsOptional() @IsString() @MaxLength(120)
  title?: string;

  @IsOptional() @IsString() @MaxLength(200)
  subtitle?: string;

  @IsOptional() @IsString() @MaxLength(40)
  ctaText?: string;

  @IsOptional() @IsString() @MaxLength(60)
  catFilter?: string;

  @IsString()
  imageUrl: string;

  @IsString()
  targetUrl: string;

  @IsOptional() @Transform(({ value }) => (value != null ? parseInt(value, 10) : undefined))
  @IsInt()
  sortOrder?: number;

  @IsOptional() @IsDateString()
  startsAt?: string;

  @IsOptional() @IsDateString()
  endsAt?: string;
}
