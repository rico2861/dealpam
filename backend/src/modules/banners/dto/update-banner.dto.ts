import { PartialType } from '@nestjs/swagger';
import { CreateBannerDto } from './create-banner.dto';
import { IsOptional, IsBoolean } from 'class-validator';

export class UpdateBannerDto extends PartialType(CreateBannerDto) {
  @IsOptional() @IsBoolean()
  isActive?: boolean;
}
