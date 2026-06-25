import { IsEmail, IsString, MinLength, MaxLength, Matches } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail({}, { message: 'Email invalide' })
  @MaxLength(254, { message: 'Email trop long' })
  @Transform(({ value }) => value?.toLowerCase()?.trim())
  email: string;

  @ApiProperty()
  @IsString()
  @MinLength(8, { message: 'Mot de passe trop court (min 8 caractères)' })
  @MaxLength(128, { message: 'Mot de passe trop long' })
  password: string;
}
