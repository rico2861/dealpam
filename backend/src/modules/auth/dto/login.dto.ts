import { IsString, MinLength, MaxLength, IsOptional } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({
    example: 'user@example.com or @username',
    description: 'Email address OR username (case-insensitive)',
  })
  @IsString({ message: 'Identifiant invalide' })
  @MinLength(3, { message: 'Identifiant trop court' })
  @MaxLength(254, { message: 'Identifiant trop long' })
  @Transform(({ value }) => value?.trim())
  identifier: string;

  @ApiProperty()
  @IsString()
  @MinLength(8, { message: 'Mot de passe trop court (min 8 caractères)' })
  @MaxLength(128, { message: 'Mot de passe trop long' })
  password: string;

  // 'user' = user/seller platform, 'admin' = admin panel
  // Used to block admin accounts from logging into the user platform
  @IsOptional() @IsString()
  clientType?: 'user' | 'admin';
}
