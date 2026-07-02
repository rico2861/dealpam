import { Controller, Post, Body, HttpCode, Req, UseGuards, Get, Query, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { CurrentUser } from '../../shared/decorators/current-user.decorator';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { IsEmail, IsString, MinLength, MaxLength, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

class ForgotPasswordDto {
  @ApiProperty() @IsEmail() email: string;
}

class ResetPasswordDto {
  @ApiProperty() @IsString() @MinLength(32) @MaxLength(128) token: string;
  @ApiProperty()
  @IsString()
  @MinLength(8, { message: 'Mot de passe trop court (min 8 caractères)' })
  @MaxLength(128)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()\-_=+\[\]{}|;:,.<>?/\\~`"'])/, {
    message: "Le mot de passe doit contenir une minuscule, une majuscule, un chiffre et un caractère spécial",
  })
  password: string;
}

@ApiTags('Auth')
@Controller('auth')
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

  @Post('verify-reset-code')
  @HttpCode(200)
  @ApiOperation({ summary: 'Vérifier le code OTP de réinitialisation (6 chiffres)' })
  @Throttle({ default: { limit: 10, ttl: 300000 } })
  verifyResetCode(@Body('email') email: string, @Body('code') code: string) {
    if (!email || !code) throw new BadRequestException('email et code requis');
    return this.authService.verifyResetCode(email, code);
  }

  @Post('reset-password')
  @HttpCode(200)
  @ApiOperation({ summary: 'Réinitialiser le mot de passe avec un token' })
  @Throttle({ default: { limit: 5, ttl: 300000 } })
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto.token, dto.password);
  }

  // Forced password change — called right after login if mustChangePassword is true
  @Post('change-password-forced')
  @UseGuards(JwtAuthGuard)
  @HttpCode(200)
  changePasswordForced(@CurrentUser() u: any, @Body('newPassword') newPassword: string) {
    return this.authService.changePasswordForced(u.id, newPassword);
  }

  // Rate-limited: 30 checks per minute per IP — prevents email enumeration abuse
  @Get('check-availability')
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  checkAvailability(
    @Query('email') email?: string,
    @Query('username') username?: string,
  ) {
    return this.authService.checkAvailability(email, username);
  }
}
