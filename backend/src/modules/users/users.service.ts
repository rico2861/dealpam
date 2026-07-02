import { Injectable, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service';
import { MailService } from '../mail/mail.service';

const USER_PUBLIC_SELECT = {
  id: true, email: true, username: true, firstName: true, lastName: true,
  role: true, phone: true, avatar: true, isActive: true,
  city: true, department: true, createdAt: true, updatedAt: true,
  lastLoginAt: true,
};

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService, private mail: MailService) {}

  // ── Admin: list all users ─────────────────────────────────────────────────

  async findAll(page = 1, limit = 20, filters?: { role?: string; isActive?: boolean; search?: string }) {
    const where: any = {
      // Always hide admin/moderator accounts from the user list for discretion
      role: { notIn: ['ADMIN', 'SUPER_ADMIN', 'MODERATOR'] },
    };
    if (filters?.role)          where.role     = filters.role;
    if (filters?.isActive !== undefined) where.isActive = filters.isActive;
    if (filters?.search) {
      const s = filters.search.trim();
      where.OR = [
        { email:     { contains: s, mode: 'insensitive' } },
        { username:  { contains: s, mode: 'insensitive' } },
        { firstName: { contains: s, mode: 'insensitive' } },
        { lastName:  { contains: s, mode: 'insensitive' } },
        { phone:     { contains: s } },
      ];
    }

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        select: {
          ...USER_PUBLIC_SELECT,
          failedLoginAttempts: true,
          lockedUntil:         true,
          seller: {
            select: {
              id:     true,
              status: true,
              stores: { select: { id: true, name: true, isPrimary: true } },
              _count: { select: { stores: true } },
            },
          },
        },
        skip: (page - 1) * limit, take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.user.count({ where }),
    ]);

    return { users, total, page, pages: Math.ceil(total / limit) };
  }

  // ── Admin: single user detail ─────────────────────────────────────────────

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        ...USER_PUBLIC_SELECT,
        failedLoginAttempts: true,
        lockedUntil:         true,
        mustChangePassword:  true,
        isEmailVerified:     true,
        seller: {
          include: {
            stores:        { include: { _count: { select: { products: true, orders: true } } } },
            subscriptions: { where: { isActive: true }, include: { plan: true }, take: 1 },
            documents:     { select: { id: true, type: true, isValid: true, createdAt: true } },
          },
        },
        orders:    { select: { id: true, status: true, totalHTG: true, createdAt: true }, orderBy: { createdAt: 'desc' }, take: 5 },
        addresses: { select: { id: true, label: true, city: true, department: true, isDefault: true } },
        _count:    { select: { orders: true, reviews: true, wishlistItems: true } },
      },
    });
    if (!user) throw new NotFoundException('Utilisateur introuvable');
    return user;
  }

  // ── Self-update (profile) ─────────────────────────────────────────────────

  update(id: string, data: { firstName?: string; lastName?: string; phone?: string; avatar?: string; city?: string; department?: string; username?: string }) {
    return this.prisma.user.update({
      where: { id }, data,
      select: { id: true, email: true, username: true, firstName: true, lastName: true, phone: true, avatar: true, city: true, department: true },
    });
  }

  updateAwayMessage(id: string, enabled: boolean, message?: string) {
    return (this.prisma.user as any).update({
      where: { id },
      data: { awayMessageEnabled: enabled, awayMessage: message ?? null },
      select: { id: true, awayMessageEnabled: true, awayMessage: true },
    });
  }

  getAwayMessage(id: string): Promise<{ awayMessageEnabled: boolean; awayMessage: string | null }> {
    return (this.prisma.user as any).findUnique({
      where: { id },
      select: { awayMessageEnabled: true, awayMessage: true },
    });
  }

  // ── Addresses ─────────────────────────────────────────────────────────────

  getAddresses(userId: string) {
    return this.prisma.address.findMany({ where: { userId }, orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }] });
  }

  async addAddress(userId: string, data: { label: string; fullName: string; phone: string; line1: string; city: string; department: string; isDefault?: boolean }) {
    if (data.isDefault) {
      await this.prisma.address.updateMany({ where: { userId }, data: { isDefault: false } });
    }
    const count = await this.prisma.address.count({ where: { userId } });
    return this.prisma.address.create({ data: { userId, ...data, isDefault: data.isDefault ?? count === 0 } });
  }

  async removeAddress(userId: string, addressId: string) {
    await this.prisma.address.deleteMany({ where: { id: addressId, userId } });
    return { success: true };
  }

  async setDefaultAddress(userId: string, addressId: string) {
    await this.prisma.address.updateMany({ where: { userId }, data: { isDefault: false } });
    const { count } = await this.prisma.address.updateMany({
      where: { id: addressId, userId },
      data: { isDefault: true },
    });
    if (count === 0) {
      throw new NotFoundException('Address not found');
    }
    return this.prisma.address.findUnique({ where: { id: addressId } });
  }

  // ── Admin actions ─────────────────────────────────────────────────────────

  disable(id: string) {
    return this.prisma.user.update({ where: { id }, data: { isActive: false, tokenVersion: { increment: 1 } } });
  }
  enable(id: string) {
    return this.prisma.user.update({ where: { id }, data: { isActive: true } });
  }

  async unlock(id: string) {
    return this.prisma.user.update({
      where: { id },
      data: { lockedUntil: null, failedLoginAttempts: 0 },
    });
  }

  async adminResetPassword(userId: string): Promise<{ message: string }> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('Utilisateur introuvable');

    const words = ['Deal', 'Pam', 'Mart', 'Shop', 'Haiti', 'Vente', 'Achat', 'Store'];
    const w = () => words[Math.floor(Math.random() * words.length)];
    const d = () => Math.floor(Math.random() * 9000 + 1000);
    const tempPassword = `${w()}${w()}${d()}`;

    const hash = await bcrypt.hash(tempPassword, 12);
    await this.prisma.user.update({ where: { id: userId }, data: { passwordHash: hash, mustChangePassword: true } });
    await this.mail.sendAdminPasswordReset(user.email, user.firstName, tempPassword);
    return { message: `Mot de passe temporaire envoyé à ${user.email}` };
  }

  async saveLocation(userId: string, data: { department: string; city: string; source?: string; lat?: number; lng?: number }) {
    await this.prisma.user.update({
      where: { id: userId },
      data:  { department: data.department, city: data.city },
    });
    return { ok: true, department: data.department, city: data.city };
  }

  async updatePublicKey(userId: string, publicKey: string) {
    return (this.prisma.user as any).update({
      where: { id: userId },
      data: { publicKey },
      select: { id: true, publicKey: true },
    });
  }

  async getPublicKey(userId: string): Promise<string | null> {
    const u = await (this.prisma.user as any).findUnique({
      where: { id: userId },
      select: { publicKey: true },
    });
    return u?.publicKey ?? null;
  }

  // ── Staff management ──────────────────────────────────────────────────────

  static readonly STAFF_ROLES = ['CUSTOMER_CARE', 'PARTNER', 'ACCOUNTANT', 'MODERATOR'];

  async createStaff(data: {
    firstName: string; lastName: string; email: string; password: string; role: string;
    partnershipPercent?: number; responsibilities?: string; notes?: string;
  }) {
    const { BadRequestException } = await import('@nestjs/common');
    if (!UsersService.STAFF_ROLES.includes(data.role)) throw new BadRequestException('Rôle invalide');
    const exists = await this.prisma.user.findUnique({ where: { email: data.email } });
    if (exists) throw new BadRequestException('Email déjà utilisé');
    const hash = await bcrypt.hash(data.password, 10);
    const staffMeta = data.role === 'PARTNER' ? JSON.stringify({
      partnershipPercent: data.partnershipPercent ?? 0,
      responsibilities:   data.responsibilities  ?? '',
      notes:              data.notes             ?? '',
    }) : null;
    return this.prisma.user.create({
      data: { firstName: data.firstName, lastName: data.lastName, email: data.email, passwordHash: hash, role: data.role, isActive: true, staffMeta, mustChangePassword: true },
      select: { id: true, email: true, firstName: true, lastName: true, role: true, isActive: true, createdAt: true, staffMeta: true, mustChangePassword: true },
    });
  }

  async generateTempPassword(staffId: string): Promise<{ tempPassword: string }> {
    const { NotFoundException } = await import('@nestjs/common');
    const user = await this.prisma.user.findUnique({ where: { id: staffId } });
    if (!user || !UsersService.STAFF_ROLES.includes(user.role)) throw new NotFoundException('Compte staff introuvable');
    // Generate readable temp password: word + number
    const words = ['Delta','Echo','Foxtrot','Sierra','Tango','Victor','Whiskey','Zulu','Alpha','Bravo'];
    const word = words[Math.floor(Math.random() * words.length)];
    const num  = Math.floor(100 + Math.random() * 900);
    const sym  = ['!','@','#','$','%'][Math.floor(Math.random() * 5)];
    const tempPassword = `${word}${num}${sym}`;
    const hash = await bcrypt.hash(tempPassword, 10);
    await this.prisma.user.update({ where: { id: staffId }, data: { passwordHash: hash, mustChangePassword: true, tokenVersion: { increment: 1 } } });
    return { tempPassword };
  }

  async updateStaffMeta(id: string, meta: { partnershipPercent?: number; responsibilities?: string; notes?: string }) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new (await import('@nestjs/common')).NotFoundException();
    let current: any = {};
    if (user.staffMeta) {
      try { current = JSON.parse(user.staffMeta as string); } catch { current = {}; }
    }
    const updated = { ...current, ...meta };
    return this.prisma.user.update({ where: { id }, data: { staffMeta: JSON.stringify(updated) }, select: { id: true, staffMeta: true } });
  }

  async listStaff() {
    return this.prisma.user.findMany({
      where: { role: { in: UsersService.STAFF_ROLES } },
      select: { id: true, email: true, firstName: true, lastName: true, role: true, isActive: true, createdAt: true, lastLoginAt: true, staffMeta: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getPartnerStats(userId: string, period: string = 'month') {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { staffMeta: true, firstName: true, lastName: true, email: true } });
    let meta: any = {};
    if (user?.staffMeta) {
      try { meta = JSON.parse(user.staffMeta as string); } catch { meta = {}; }
    }
    const pct: number = meta.partnershipPercent ?? 0;

    // ── Period range ──────────────────────────────────────────────────────────
    const now = new Date();
    let rangeStart: Date;
    let rangeLabel: string;

    switch (period) {
      case '7d':
        rangeStart = new Date(now); rangeStart.setDate(rangeStart.getDate() - 7);
        rangeLabel = '7 derniers jours'; break;
      case 'month': {
        rangeStart = new Date(now.getFullYear(), now.getMonth(), 1);
        rangeLabel = now.toLocaleString('fr-FR', { month: 'long', year: 'numeric' }); break;
      }
      case 'prev_month': {
        rangeStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const end = new Date(now.getFullYear(), now.getMonth(), 0);
        rangeLabel = rangeStart.toLocaleString('fr-FR', { month: 'long', year: 'numeric' });
        const [periodAgg, allTime, kpis] = await Promise.all([
          this.prisma.payment.aggregate({ where: { status: 'COMPLETED', paidAt: { gte: rangeStart, lte: end } }, _sum: { amountHTG: true } }),
          this.prisma.payment.aggregate({ where: { status: 'COMPLETED' }, _sum: { amountHTG: true } }),
          this._getKpis(),
        ]);
        const periodRevenue = Number(periodAgg._sum.amountHTG ?? 0);
        const allTimeRevenue = Number(allTime._sum.amountHTG ?? 0);
        return this._buildStats(meta, pct, periodRevenue, allTimeRevenue, rangeLabel, [], kpis);
      }
      case 'year':
        rangeStart = new Date(now.getFullYear(), 0, 1);
        rangeLabel = `Année ${now.getFullYear()}`; break;
      default: // 'all'
        rangeStart = new Date(0);
        rangeLabel = 'Depuis le lancement'; break;
    }

    // Payments in range + chart data (monthly for year/all, daily for 7d/month)
    const [periodAgg, allTimeAgg, periodPayments, kpis] = await Promise.all([
      this.prisma.payment.aggregate({ where: { status: 'COMPLETED', paidAt: { gte: rangeStart } }, _sum: { amountHTG: true } }),
      this.prisma.payment.aggregate({ where: { status: 'COMPLETED' }, _sum: { amountHTG: true } }),
      this.prisma.payment.findMany({ where: { status: 'COMPLETED', paidAt: { gte: rangeStart } }, select: { amountHTG: true, paidAt: true }, orderBy: { paidAt: 'asc' } }),
      this._getKpis(),
    ]);

    const periodRevenue  = Number(periodAgg._sum.amountHTG  ?? 0);
    const allTimeRevenue = Number(allTimeAgg._sum.amountHTG ?? 0);

    // Build chart points
    const chart = this._buildChart(period, rangeStart, periodPayments, pct);

    return this._buildStats(meta, pct, periodRevenue, allTimeRevenue, rangeLabel, chart, kpis);
  }

  private async _getKpis() {
    const [totalSellers, totalOrders, activeSubscriptions, totalUsers] = await Promise.all([
      this.prisma.seller.count({ where: { status: 'APPROVED' } }),
      this.prisma.order.count({ where: { status: 'DELIVERED' } }),
      this.prisma.sellerSubscription.count({ where: { isActive: true } }),
      this.prisma.user.count({ where: { isActive: true, role: { notIn: ['ADMIN', 'SUPER_ADMIN', 'MODERATOR', 'PARTNER', 'CUSTOMER_CARE', 'ACCOUNTANT'] } } }),
    ]);
    return { totalSellers, totalOrders, activeSubscriptions, totalUsers };
  }

  private _buildChart(period: string, rangeStart: Date, payments: { amountHTG: any; paidAt: Date | null }[], pct: number) {
    const map: Record<string, number> = {};
    for (const p of payments) {
      const d = p.paidAt ?? new Date();
      const key = period === '7d' || period === 'month'
        ? `${d.getDate()}/${d.getMonth() + 1}`
        : `${d.toLocaleString('fr-FR', { month: 'short' })} ${d.getFullYear().toString().slice(2)}`;
      map[key] = (map[key] || 0) + Number(p.amountHTG);
    }

    if (period === '7d') {
      return Array.from({ length: 7 }, (_, i) => {
        const d = new Date(); d.setDate(d.getDate() - (6 - i));
        const key = `${d.getDate()}/${d.getMonth() + 1}`;
        const rev = Math.round(map[key] || 0);
        return { label: key, revenue: rev, dividend: Math.round(rev * pct / 100) };
      });
    }
    if (period === 'month') {
      const daysInMonth = new Date(rangeStart.getFullYear(), rangeStart.getMonth() + 1, 0).getDate();
      return Array.from({ length: daysInMonth }, (_, i) => {
        const key = `${i + 1}/${rangeStart.getMonth() + 1}`;
        const rev = Math.round(map[key] || 0);
        return { label: `${i + 1}`, revenue: rev, dividend: Math.round(rev * pct / 100) };
      });
    }
    // year / all → monthly
    const months = period === 'year' ? 12 : 24;
    return Array.from({ length: months }, (_, i) => {
      const d = new Date(); d.setMonth(d.getMonth() - (months - 1 - i));
      const key = `${d.toLocaleString('fr-FR', { month: 'short' })} ${d.getFullYear().toString().slice(2)}`;
      const rev = Math.round(map[key] || 0);
      return { label: key, revenue: rev, dividend: Math.round(rev * pct / 100) };
    });
  }

  private _buildStats(meta: any, pct: number, periodRevenue: number, allTimeRevenue: number, rangeLabel: string, chart: any[], kpis: any) {
    return {
      partnerName: `${meta.firstName || ''} ${meta.lastName || ''}`.trim(),
      partnershipPercent: pct,
      responsibilities: meta.responsibilities ?? '',
      notes: meta.notes ?? '',
      rangeLabel,
      periodRevenue,
      periodDividend: Math.round(periodRevenue * pct / 100),
      allTimeRevenue,
      allTimeDividend: Math.round(allTimeRevenue * pct / 100),
      chart,
      kpis,
    };
  }
}
