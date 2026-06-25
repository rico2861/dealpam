"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const prisma_service_1 = require("../../prisma/prisma.service");
const mail_service_1 = require("../mail/mail.service");
const MAX_FAILED_ATTEMPTS = 2;
const LOCK_DURATION_MS = 30 * 60 * 1000;
const RESET_TOKEN_EXPIRES_MS = 60 * 60 * 1000;
let AuthService = class AuthService {
    constructor(prisma, jwtService, mailService) {
        this.prisma = prisma;
        this.jwtService = jwtService;
        this.mailService = mailService;
    }
    async register(dto) {
        const exists = await this.prisma.user.findUnique({ where: { email: dto.email.toLowerCase() } });
        if (exists)
            throw new common_1.ConflictException('Email déjà utilisé');
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
            if (!dto.storeName)
                throw new common_1.BadRequestException('Nom de boutique requis pour les vendeurs');
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
    async login(dto, ip) {
        const email = dto.email.toLowerCase();
        const user = await this.prisma.user.findUnique({ where: { email } });
        const dummyHash = '$2b$12$invalidhashfortimingprotectiononly............';
        if (!user) {
            await bcrypt.compare(dto.password, dummyHash);
            throw new common_1.UnauthorizedException('Identifiants invalides');
        }
        if (user.lockedUntil && user.lockedUntil > new Date()) {
            const minutesLeft = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60000);
            throw new common_1.ForbiddenException(`Compte bloqué. Réessayez dans ${minutesLeft} minute(s) ou réinitialisez votre mot de passe via l'email reçu.`);
        }
        if (!user.isActive)
            throw new common_1.ForbiddenException('Compte désactivé. Contactez le support.');
        const valid = await bcrypt.compare(dto.password, user.passwordHash);
        if (!valid) {
            const newAttempts = user.failedLoginAttempts + 1;
            if (newAttempts >= MAX_FAILED_ATTEMPTS) {
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
                this.mailService.sendAccountLocked(user.email, user.firstName, resetUrl).catch(() => null);
                throw new common_1.ForbiddenException('Compte bloqué après 2 tentatives échouées. Un email de réinitialisation vous a été envoyé.');
            }
            await this.prisma.user.update({
                where: { id: user.id },
                data: { failedLoginAttempts: newAttempts },
            });
            const remaining = MAX_FAILED_ATTEMPTS - newAttempts;
            throw new common_1.UnauthorizedException(`Identifiants invalides. ${remaining} tentative(s) restante(s) avant le blocage du compte.`);
        }
        if (user.failedLoginAttempts > 0 || user.lockedUntil) {
            await this.prisma.user.update({
                where: { id: user.id },
                data: { failedLoginAttempts: 0, lockedUntil: null },
            });
        }
        const tokens = await this.generateTokens(user.id, user.email, user.role);
        return { user: this.sanitizeUser(user), ...tokens };
    }
    async forgotPassword(email) {
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
                    lockedUntil: null,
                    failedLoginAttempts: 0,
                },
            });
            const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password?token=${rawToken}`;
            this.mailService.sendPasswordReset(user.email, user.firstName, resetUrl).catch(() => null);
        }
        return { message: 'Si cet email existe, un lien de réinitialisation a été envoyé.' };
    }
    async resetPassword(token, newPassword) {
        if (!token || token.length < 32)
            throw new common_1.BadRequestException('Token invalide');
        const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
        const user = await this.prisma.user.findFirst({
            where: {
                passwordResetToken: tokenHash,
                passwordResetExpires: { gt: new Date() },
            },
        });
        if (!user)
            throw new common_1.BadRequestException('Token invalide ou expiré. Faites une nouvelle demande.');
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
        await this.prisma.refreshToken.deleteMany({ where: { userId: user.id } });
        this.mailService.sendPasswordChanged(user.email, user.firstName).catch(() => null);
        return { message: 'Mot de passe réinitialisé avec succès. Vous pouvez vous connecter.' };
    }
    async refresh(token) {
        if (!token)
            throw new common_1.UnauthorizedException('Token manquant');
        const stored = await this.prisma.refreshToken.findUnique({ where: { token }, include: { user: true } });
        if (!stored || stored.expiresAt < new Date()) {
            if (stored)
                await this.prisma.refreshToken.delete({ where: { token } });
            throw new common_1.UnauthorizedException('Session expirée, veuillez vous reconnecter');
        }
        if (!stored.user.isActive)
            throw new common_1.ForbiddenException('Compte désactivé');
        await this.prisma.refreshToken.delete({ where: { token } });
        return this.generateTokens(stored.user.id, stored.user.email, stored.user.role);
    }
    async logout(token) {
        if (token)
            await this.prisma.refreshToken.deleteMany({ where: { token } });
    }
    async generateTokens(userId, email, role) {
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
    sanitizeUser(user) {
        const { passwordHash, failedLoginAttempts, lockedUntil, passwordResetToken, passwordResetExpires, ...rest } = user;
        return rest;
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        jwt_1.JwtService,
        mail_service_1.MailService])
], AuthService);
//# sourceMappingURL=auth.service.js.map