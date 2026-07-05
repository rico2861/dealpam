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
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

const MAX_FAILED_ATTEMPTS = 5;
const LOCK_DURATION_MS    = 30 * 60 * 1000; // 30 min
const RESET_TOKEN_EXPIRES = 15 * 60 * 1000; // 15 min

// Plan tier → max stores allowed
const PLAN_STORE_LIMITS: Record<string, number> = {
  STARTER:  1,
  BUSINESS: 3,
  PREMIUM:  5,
  ELITE:    10,
};

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private mailService: MailService,
    private subscriptionsService: SubscriptionsService,
  ) {}

  // ── Register ────────────────────────────────────────────────────────────────

  async register(dto: RegisterDto) {
    const emailLower = dto.email.toLowerCase();

    // Domaine réservé au staff interne — jamais utilisable pour un compte
    // client/vendeur public (empêche l'usurpation de comptes "officiels").
    if (emailLower.endsWith('@dealpam.com')) {
      throw new BadRequestException('Ce domaine email est réservé et ne peut pas être utilisé pour créer un compte.');
    }

    // Check duplicates in parallel
    const [emailExists, usernameExists] = await Promise.all([
      this.prisma.user.findUnique({ where: { email: emailLower } }),
      dto.username ? this.prisma.user.findUnique({ where: { username: dto.username.toLowerCase() } }) : null,
    ]);

    if (emailExists)    throw new ConflictException('Cet email est déjà utilisé');
    if (usernameExists) throw new ConflictException('Ce username est déjà pris');

    // Auto-generate username if not provided
    const username = dto.username
      ? dto.username.toLowerCase()
      : await this.generateUsername(dto.firstName, dto.lastName);

    const passwordHash = await bcrypt.hash(dto.password, 12);

    const user = await this.prisma.user.create({
      data: {
        email:     emailLower,
        username,
        passwordHash,
        firstName: dto.firstName.trim(),
        lastName:  dto.lastName.trim(),
        phone:     dto.phone?.trim() || null,
        role:      dto.role === 'SELLER' ? 'SELLER' : 'CUSTOMER',
      },
    });

    if (dto.role === 'SELLER') {
      if (!dto.storeName) throw new BadRequestException('Nom de boutique requis pour les vendeurs');

      const storeNameTrimmed = dto.storeName.trim();
      const nameTaken = await (this.prisma.store as any).findFirst({
        where: { name: { equals: storeNameTrimmed, mode: 'insensitive' } },
      });
      if (nameTaken) throw new ConflictException('Ce nom de boutique est déjà utilisé sur la plateforme. Choisissez-en un autre.');

      const seller = await this.prisma.seller.create({
        data: { userId: user.id, nif: dto.nif || null },
      });

      const slug      = this.buildSlug(dto.storeName);
      const storeCode = await this.generateStoreCode();
      await (this.prisma.store as any).create({
        data: {
          sellerId:    seller.id,
          storeCode,
          name:        storeNameTrimmed,
          slug:        `${slug}-${Date.now().toString(36)}`,
          description: dto.storeDescription?.trim() || null,
          isPrimary:   true,
        },
      });

      // Essai gratuit 30 jours offert à tous les nouveaux vendeurs — soumis aux
      // mêmes règles anti-abus (téléphone/email/NIF) que l'essai manuel.
      try {
        const trial = await this.subscriptionsService.startTrial(user.id);
        this.mailService
          .sendSellerWelcomeTrial(user.email, user.firstName, storeNameTrimmed, trial.endDate)
          .catch(() => null);
      } catch (err) {
        // Ex: téléphone/email/NIF déjà utilisé pour un essai précédent — le compte
        // est quand même créé, simplement sans essai gratuit automatique.
      }
    }

    const tokens = await this.generateTokens(user.id, user.email, user.role);
    return { user: this.sanitize(user), ...tokens };
  }

  // ── Login (email OR username) ───────────────────────────────────────────────

  async login(dto: LoginDto, ip?: string) {
    const identifier = dto.identifier.toLowerCase().trim();
    const isEmail    = identifier.includes('@');

    // Lookup by email or username
    const user = isEmail
      ? await this.prisma.user.findUnique({ where: { email: identifier } })
      : await this.prisma.user.findUnique({ where: { username: identifier } });

    // Timing-safe: always do a hash compare even for non-existent accounts
    const dummy = '$2b$12$invalidhashfortimingprotectiononly............';
    if (!user) {
      await bcrypt.compare(dto.password, dummy);
      throw new UnauthorizedException('Identifiants invalides');
    }

    if (user.lockedUntil && user.lockedUntil > new Date()) {
      const mins = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60000);
      throw new ForbiddenException(`Compte temporairement bloqué suite à plusieurs échecs de connexion. Réessayez dans ${mins} min, ou réinitialisez votre mot de passe via "Mot de passe oublié".`);
    }

    if (!user.isActive) throw new ForbiddenException('Compte désactivé. Contactez le support.');

    // Admin/staff accounts can only log in via the admin panel, never via the user platform
    const STAFF_ROLES = ['ADMIN', 'SUPER_ADMIN', 'MODERATOR', 'CUSTOMER_CARE', 'PARTNER', 'ACCOUNTANT'];
    if (STAFF_ROLES.includes(user.role) && dto.clientType === 'user') {
      throw new ForbiddenException('Ce compte est réservé à l\'espace administration. Utilisez le panneau admin.');
    }

    const valid = await bcrypt.compare(dto.password, user.passwordHash);

    if (!valid) {
      const attempts = user.failedLoginAttempts + 1;

      if (attempts >= MAX_FAILED_ATTEMPTS) {
        const rawToken  = crypto.randomBytes(32).toString('hex');
        const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
        const locked    = new Date(Date.now() + LOCK_DURATION_MS);
        const expires   = new Date(Date.now() + RESET_TOKEN_EXPIRES);

        await this.prisma.user.update({
          where: { id: user.id },
          data: { failedLoginAttempts: attempts, lockedUntil: locked,
                  tokenVersion: { increment: 1 },
                  passwordResetToken: tokenHash, passwordResetExpires: expires },
        });

        const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${rawToken}`;
        this.mailService.sendAccountLocked(user.email, user.firstName, resetUrl, MailService.accountForRole(user.role)).catch(() => null);
        throw new ForbiddenException('Compte bloqué après 5 tentatives échouées. Un email pour réinitialiser votre mot de passe vous a été envoyé.');
      }

      await this.prisma.user.update({ where: { id: user.id }, data: { failedLoginAttempts: attempts } });
      const remaining = MAX_FAILED_ATTEMPTS - attempts;
      const s = remaining > 1 ? 's' : '';
      throw new UnauthorizedException(
        `Email ou mot de passe incorrect. Il vous reste ${remaining} tentative${s} avant le blocage temporaire (30 min) de ce compte.`
      );
    }

    // Success — reset counter, record login
    await this.prisma.user.update({
      where: { id: user.id },
      data: { failedLoginAttempts: 0, lockedUntil: null, lastLoginAt: new Date(), lastLoginIp: ip || null },
    });

    const tokens = await this.generateTokens(user.id, user.email, user.role, user.tokenVersion);
    return { user: this.sanitize(user), ...tokens };
  }

  // ── Password flows ──────────────────────────────────────────────────────────

  async forgotPassword(email: string) {
    const user = await this.prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (user?.isActive) {
      // Generate 6-digit numeric code
      const code      = Math.floor(100000 + Math.random() * 900000).toString();
      const codeHash  = crypto.createHash('sha256').update(code).digest('hex');
      const expires   = new Date(Date.now() + RESET_TOKEN_EXPIRES);
      await this.prisma.user.update({
        where: { id: user.id },
        data: { passwordResetToken: codeHash, passwordResetExpires: expires, lockedUntil: null, failedLoginAttempts: 0 },
      });
      this.mailService.sendPasswordResetCode(user.email, user.firstName, code, MailService.accountForRole(user.role)).catch(() => null);
    }
    return { message: 'Si cet email existe, un code de vérification vous a été envoyé.' };
  }

  async verifyResetCode(email: string, code: string) {
    if (!email || !code || code.length !== 6) throw new BadRequestException('Code invalide');
    const user = await this.prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (!user) throw new BadRequestException('Code invalide ou expiré');

    const codeHash = crypto.createHash('sha256').update(code).digest('hex');
    if (
      user.passwordResetToken !== codeHash ||
      !user.passwordResetExpires ||
      user.passwordResetExpires < new Date()
    ) throw new BadRequestException('Code invalide ou expiré');

    // Code is valid — swap it for a full reset token (5-min window to set new password)
    const rawToken  = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const expires   = new Date(Date.now() + 5 * 60 * 1000);
    await this.prisma.user.update({
      where: { id: user.id },
      data: { passwordResetToken: tokenHash, passwordResetExpires: expires },
    });
    return { resetToken: rawToken };
  }

  async resetPassword(token: string, newPassword: string) {
    if (!token || token.length < 32) throw new BadRequestException('Token invalide');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const user = await this.prisma.user.findFirst({
      where: { passwordResetToken: tokenHash, passwordResetExpires: { gt: new Date() } },
    });
    if (!user) throw new BadRequestException('Token invalide ou expiré.');

    await this.prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: await bcrypt.hash(newPassword, 12),
              passwordResetToken: null, passwordResetExpires: null,
              failedLoginAttempts: 0, lockedUntil: null },
    });
    await this.prisma.refreshToken.deleteMany({ where: { userId: user.id } });
    return { message: 'Mot de passe réinitialisé. Vous pouvez vous connecter.' };
  }

  // ── Token management ────────────────────────────────────────────────────────

  async refresh(token: string) {
    if (!token) throw new UnauthorizedException('Token manquant');
    const stored = await this.prisma.refreshToken.findUnique({ where: { token }, include: { user: true } });
    if (!stored || stored.expiresAt < new Date()) {
      if (stored) await this.prisma.refreshToken.delete({ where: { token } });
      throw new UnauthorizedException('Session expirée, veuillez vous reconnecter');
    }
    if (!stored.user.isActive) throw new ForbiddenException('Compte désactivé');
    if (stored.user.lockedUntil && stored.user.lockedUntil > new Date())
      throw new ForbiddenException('Compte bloqué');
    await this.prisma.refreshToken.delete({ where: { token } });
    return this.generateTokens(stored.user.id, stored.user.email, stored.user.role, stored.user.tokenVersion);
  }

  async logout(token: string) {
    if (token) await this.prisma.refreshToken.deleteMany({ where: { token } });
  }

  async checkAvailability(email?: string, username?: string) {
    const result: { emailTaken?: boolean; usernameTaken?: boolean } = {};
    if (email) {
      const u = await this.prisma.user.findUnique({ where: { email: email.toLowerCase().trim() }, select: { id: true } });
      result.emailTaken = !!u;
    }
    if (username) {
      const u = await this.prisma.user.findUnique({ where: { username: username.toLowerCase().trim() }, select: { id: true } });
      result.usernameTaken = !!u;
    }
    return result;
  }

  // ── Helpers ─────────────────────────────────────────────────────────────────

  private async generateTokens(userId: string, email: string, role: string, tokenVersion = 0) {
    const payload      = { sub: userId, email, role, tv: tokenVersion };
    const accessToken  = this.jwtService.sign(payload);
    const refreshToken = this.jwtService.sign(payload, {
      secret:    process.env.JWT_REFRESH_SECRET,
      expiresIn: (process.env.JWT_REFRESH_EXPIRES_IN || '7d') as any,
    });
    await this.prisma.refreshToken.create({
      data: { token: refreshToken, userId, expiresAt: new Date(Date.now() + 7 * 86400000) },
    });
    return { accessToken, refreshToken };
  }

  // ── Force password change (first login with admin-created credentials) ─────

  async changePasswordForced(userId: string, newPassword: string) {
    if (!newPassword || newPassword.length < 8)
      throw new BadRequestException('Le mot de passe doit contenir au moins 8 caractères');
    const hash = await bcrypt.hash(newPassword, 12);
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash: hash, mustChangePassword: false, tokenVersion: { increment: 1 } },
    });
    return { message: 'Mot de passe mis à jour avec succès' };
  }

  private sanitize(user: any) {
    const { passwordHash, failedLoginAttempts, lockedUntil, passwordResetToken, passwordResetExpires, lastLoginIp, staffMeta, ...rest } = user;
    return rest; // mustChangePassword is intentionally kept so frontends can detect forced change
  }

  private buildSlug(name: string): string {
    return name.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '').slice(0, 60);
  }

  /** Auto-generate unique username like marie_jean or marie_jean_42 */
  private async generateUsername(firstName: string, lastName: string): Promise<string> {
    const base = `${firstName.toLowerCase()}_${lastName.toLowerCase()}`
      .normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9_]/g, '').slice(0, 25);

    let candidate = base;
    let attempt   = 0;
    const MAX_ATTEMPTS = 50;
    while (attempt < MAX_ATTEMPTS) {
      const exists = await this.prisma.user.findUnique({ where: { username: candidate } });
      if (!exists) return candidate;
      attempt++;
      candidate = `${base}_${attempt}`;
    }
    // Filet de sécurité : au-delà de MAX_ATTEMPTS (forte contention), suffixe aléatoire
    return `${base}_${Math.random().toString(36).slice(2, 8)}`;
  }

  private async generateStoreCode(): Promise<string> {
    for (let i = 0; i < 20; i++) {
      const digits = Math.floor(1000 + Math.random() * 9000);
      const code   = `SHOP-${digits}`;
      const exists = await (this.prisma.store as any).findUnique({ where: { storeCode: code } });
      if (!exists) return code;
    }
    return `SHOP-${Date.now().toString(36).toUpperCase().slice(-4)}`;
  }
}
