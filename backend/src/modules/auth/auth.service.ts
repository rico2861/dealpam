import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

const MAX_FAILED_ATTEMPTS = 5;
const LOCK_DURATION_MS = 30 * 60 * 1000; // 30 minutes
const RESET_TOKEN_EXPIRES_MS = 60 * 60 * 1000; // 1 hour

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private mailService: MailService,
  ) {}

  async register(dto: RegisterDto) {
    const exists = await this.prisma.user.findUnique({ where: { email: dto.email.toLowerCase() } });
    if (exists) throw new ConflictException('Email déjà utilisé');

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const user = await this.prisma.user.create({
      data: {
        email: dto.email.toLowerCase(),
        passwordHash,
        firstName: dto.firstName.trim(),
        lastName: dto.lastName.trim(),
        phone: dto.phone?.trim() || null,
        role: dto.role === 'SELLER' ? 'SELLER' : 'CUSTOMER',
      },
    });

    if (dto.role === 'SELLER') {
      if (!dto.storeName) throw new BadRequestException('Nom de boutique requis pour les vendeurs');
      const seller = await this.prisma.seller.create({
        data: { userId: user.id, nif: dto.nif || null },
      });
      const slug = dto.storeName
        .toLowerCase()
        .normalize('NFD').replace(/[̀-ͯ]/g, '')
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]/g, '')
        .slice(0, 80);
      await this.prisma.store.create({
        data: {
          sellerId: seller.id,
          name: dto.storeName.trim(),
          slug: `${slug}-${Date.now().toString(36)}`,
          description: dto.storeDescription?.trim() || null,
        },
      });
    }

    const tokens = await this.generateTokens(user.id, user.email, user.role);
    return { user: this.sanitizeUser(user), ...tokens };
  }

  async login(dto: LoginDto, ip?: string) {
    const email = dto.email.toLowerCase();
    const user = await this.prisma.user.findUnique({ where: { email } });

    // Always do a dummy compare to prevent timing attacks that reveal if email exists
    const dummyHash = '$2b$12$invalidhashfortimingprotectiononly............';
    if (!user) {
      await bcrypt.compare(dto.password, dummyHash);
      throw new UnauthorizedException('Identifiants invalides');
    }

    // Check if account is locked
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      const minutesLeft = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60000);
      throw new ForbiddenException(
        `Compte bloqué. Réessayez dans ${minutesLeft} minute(s) ou réinitialisez votre mot de passe via l'email reçu.`,
      );
    }

    if (!user.isActive) throw new ForbiddenException('Compte désactivé. Contactez le support.');

    const valid = await bcrypt.compare(dto.password, user.passwordHash);

    if (!valid) {
      const newAttempts = user.failedLoginAttempts + 1;

      if (newAttempts >= MAX_FAILED_ATTEMPTS) {
        // Generate reset token
        const rawToken = crypto.randomBytes(32).toString('hex');
        const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
        const expires = new Date(Date.now() + RESET_TOKEN_EXPIRES_MS);
        const lockedUntil = new Date(Date.now() + LOCK_DURATION_MS);

        await this.prisma.user.update({
          where: { id: user.id },
          data: {
            failedLoginAttempts: newAttempts,
            lockedUntil,
            passwordResetToken: tokenHash,
            passwordResetExpires: expires,
          },
        });

        const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password?token=${rawToken}`;
        // Fire and forget — don't block the response
        this.mailService.sendAccountLocked(user.email, user.firstName, resetUrl).catch(() => null);

        throw new ForbiddenException(
          'Compte bloqué après 5 tentatives échouées. Un email de réinitialisation vous a été envoyé.',
        );
      }

      await this.prisma.user.update({
        where: { id: user.id },
        data: { failedLoginAttempts: newAttempts },
      });

      const remaining = MAX_FAILED_ATTEMPTS - newAttempts;
      throw new UnauthorizedException(
        `Identifiants invalides. ${remaining} tentative(s) restante(s) avant le blocage du compte.`,
      );
    }

    // Successful login — reset counter and any lock
    if (user.failedLoginAttempts > 0 || user.lockedUntil) {
      await this.prisma.user.update({
        where: { id: user.id },
        data: { failedLoginAttempts: 0, lockedUntil: null },
      });
    }

    const tokens = await this.generateTokens(user.id, user.email, user.role);
    return { user: this.sanitizeUser(user), ...tokens };
  }

  async forgotPassword(email: string) {
    // Always respond the same way to prevent email enumeration
    const user = await this.prisma.user.findUnique({ where: { email: email.toLowerCase() } });

    if (user && user.isActive) {
      const rawToken = crypto.randomBytes(32).toString('hex');
      const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
      const expires = new Date(Date.now() + RESET_TOKEN_EXPIRES_MS);

      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          passwordResetToken: tokenHash,
          passwordResetExpires: expires,
          // Also unlock the account if it was locked
          lockedUntil: null,
          failedLoginAttempts: 0,
        },
      });

      const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password?token=${rawToken}`;
      this.mailService.sendPasswordReset(user.email, user.firstName, resetUrl).catch(() => null);
    }

    return { message: 'Si cet email existe, un lien de réinitialisation a été envoyé.' };
  }

  async resetPassword(token: string, newPassword: string) {
    if (!token || token.length < 32) throw new BadRequestException('Token invalide');

    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    const user = await this.prisma.user.findFirst({
      where: {
        passwordResetToken: tokenHash,
        passwordResetExpires: { gt: new Date() },
      },
    });

    if (!user) throw new BadRequestException('Token invalide ou expiré. Faites une nouvelle demande.');

    const passwordHash = await bcrypt.hash(newPassword, 12);

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        passwordResetToken: null,
        passwordResetExpires: null,
        failedLoginAttempts: 0,
        lockedUntil: null,
      },
    });

    // Revoke all existing refresh tokens for security
    await this.prisma.refreshToken.deleteMany({ where: { userId: user.id } });

    this.mailService.sendPasswordChanged(user.email, user.firstName).catch(() => null);

    return { message: 'Mot de passe réinitialisé avec succès. Vous pouvez vous connecter.' };
  }

  async refresh(token: string) {
    if (!token) throw new UnauthorizedException('Token manquant');
    const stored = await this.prisma.refreshToken.findUnique({ where: { token }, include: { user: true } });
    if (!stored || stored.expiresAt < new Date()) {
      if (stored) await this.prisma.refreshToken.delete({ where: { token } });
      throw new UnauthorizedException('Session expirée, veuillez vous reconnecter');
    }
    if (!stored.user.isActive) throw new ForbiddenException('Compte désactivé');

    await this.prisma.refreshToken.delete({ where: { token } });
    return this.generateTokens(stored.user.id, stored.user.email, stored.user.role);
  }

  async logout(token: string) {
    if (token) await this.prisma.refreshToken.deleteMany({ where: { token } });
  }

  private async generateTokens(userId: string, email: string, role: string) {
    const payload = { sub: userId, email, role };
    const accessToken = this.jwtService.sign(payload);
    const refreshToken = this.jwtService.sign(payload, {
      secret: process.env.JWT_REFRESH_SECRET,
      expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
    });

    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await this.prisma.refreshToken.create({
      data: { token: refreshToken, userId, expiresAt },
    });

    return { accessToken, refreshToken };
  }

  private sanitizeUser(user: any) {
    const { passwordHash, failedLoginAttempts, lockedUntil, passwordResetToken, passwordResetExpires, ...rest } = user;
    return rest;
  }
}
