import { IsEmail, IsString, MinLength, MaxLength, IsOptional, IsEnum, Matches } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail({}, { message: 'Email invalide' })
  @MaxLength(254, { message: 'Email trop long' })
  @Transform(({ value }) => value?.toLowerCase()?.trim())
  email: string;

  @ApiProperty({ minLength: 8 })
  @IsString()
  @MinLength(8, { message: 'Mot de passe trop court (min 8 caractères)' })
  @MaxLength(128, { message: 'Mot de passe trop long' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
    message: 'Le mot de passe doit contenir au moins une minuscule, une majuscule et un chiffre',
  })
  password: string;

  @ApiProperty()
  @IsString()
  @MinLength(2, { message: 'Prénom trop court' })
  @MaxLength(50, { message: 'Prénom trop long' })
  @Transform(({ value }) => value?.trim())
  firstName: string;

  @ApiProperty()
  @IsString()
  @MinLength(2, { message: 'Nom trop court' })
  @MaxLength(50, { message: 'Nom trop long' })
  @Transform(({ value }) => value?.trim())
  lastName: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(20, { message: 'Téléphone trop long' })
  @Matches(/^[+\d\s()-]{7,20}$/, { message: 'Numéro de téléphone invalide' })
  phone?: string;

  @ApiProperty({ enum: ['CUSTOMER', 'SELLER'], default: 'CUSTOMER', required: false })
  @IsOptional()
  @IsEnum(['CUSTOMER', 'SELLER'], { message: 'Rôle invalide' })
  role?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(100, { message: 'Nom de boutique trop long' })
  @Transform(({ value }) => value?.trim())
  storeName?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(500, { message: 'Description trop longue' })
  @Transform(({ value }) => value?.trim())
  storeDescription?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  @Matches(/^[A-Z0-9-]{5,20}$/i, { message: 'NIF invalide' })
  nif?: string;
}
