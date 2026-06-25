import { Controller, Post, Body, HttpCode, Req, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { IsEmail, IsString, MinLength, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

class ForgotPasswordDto {
  @ApiProperty() @IsEmail() email: string;
}

class ResetPasswordDto {
  @ApiProperty() @IsString() @MinLength(32) @MaxLength(128) token: string;
  @ApiProperty() @IsString() @MinLength(8) @MaxLength(128) password: string;
}

@ApiTags('Auth')
@Controller('auth')
@UseGuards(ThrottlerGuard)
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('register')
  @ApiOperation({ summary: 'Inscription' })
  // Allow 5 registrations per 10 minutes per IP
  @Throttle({ default: { limit: 5, ttl: 600000 } })
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  @HttpCode(200)
  @ApiOperation({ summary: 'Connexion' })
  // Strict: max 10 attempts per 15 minutes per IP (in addition to per-account lockout)
  @Throttle({ default: { limit: 10, ttl: 900000 } })
  login(@Body() dto: LoginDto, @Req() req: any) {
    const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip;
    return this.authService.login(dto, ip);
  }

  @Post('refresh')
  @HttpCode(200)
  @ApiOperation({ summary: 'Renouveler le token' })
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  refresh(@Body('refreshToken') token: string) {
    return this.authService.refresh(token);
  }

  @Post('logout')
  @HttpCode(200)
  @ApiOperation({ summary: 'Déconnexion' })
  logout(@Body('refreshToken') token: string) {
    return this.authService.logout(token);
  }

  @Post('forgot-password')
  @HttpCode(200)
  @ApiOperation({ summary: 'Demande de réinitialisation du mot de passe' })
  // Max 3 requests per 15 minutes per IP — prevents email bombing
  @Throttle({ default: { limit: 3, ttl: 900000 } })
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto.email);
  }

  @Post('reset-password')
  @HttpCode(200)
  @ApiOperation({ summary: 'Réinitialiser le mot de passe avec un token' })
  @Throttle({ default: { limit: 5, ttl: 300000 } })
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto.token, dto.password);
  }
}
