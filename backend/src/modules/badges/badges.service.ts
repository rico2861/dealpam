import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export const BADGE = {
  VERIFIED:        'VERIFIED',         // Store is verified by admin
  TOP_SELLER:      'TOP_SELLER',       // Consistently high sales + rating
  PREMIUM_SHOP:    'PREMIUM_SHOP',     // Premium or Enterprise subscription
  FAST_REPLY:      'FAST_REPLY',       // Avg response time < 60 min
  EXCELLENT:       'EXCELLENT',        // Avg rating >= 4.8 + 20+ reviews
  SALES_100:       'SALES_100',        // 100+ completed orders
  SALES_500:       'SALES_500',        // 500+ completed orders
  SALES_1000:      'SALES_1000',       // 1000+ completed orders
  NEW_SELLER:      'NEW_SELLER',       // Active < 30 days
  TRUSTED:         'TRUSTED',          // No complaints + 50+ sales
} as const;

type BadgeKey = typeof BADGE[keyof typeof BADGE];

interface StoreStats {
  storeId: string;
  totalSales: number;
  totalReviews: number;
  avgRating: number;
  isVerified: boolean;
  avgResponseTime: number | null;
  subscriptionTier: string | null;
  complaintCount: number;
  createdAt: Date;
}

@Injectable()
export class BadgesService {
  private readonly logger = new Logger(BadgesService.name);

  constructor(private prisma: PrismaService) {}

  // ── Compute badges for one store ─────────────────────────────────────────

  async computeBadges(storeId: string): Promise<BadgeKey[]> {
    const store = await this.prisma.store.findUnique({
      where: { id: storeId },
      include: {
        seller: {
          include: {
            subscriptions: {
              where: { isActive: true },
              include: { plan: { select: { tier: true } } },
              orderBy: { endDate: 'desc' },
              take: 1,
            },
          },
        },
      },
    });
    if (!store) return [];

    const sellerId = store.seller?.id;
    const complaintCount = sellerId ? await this.prisma.complaint.count({
      where: { sellerId, status: { in: ['CONFIRMED', 'RESOLVED_AGAINST_SELLER'] } },
    }) : 0;

    const subscriptionTier = store.seller?.subscriptions?.[0]?.plan?.tier || null;
    const ageInDays = Math.floor((Date.now() - store.createdAt.getTime()) / 86400000);

    const stats: StoreStats = {
      storeId,
      totalSales: store.totalSales,
      totalReviews: store.totalReviews,
      avgRating: store.avgRating,
      isVerified: store.isVerified,
      avgResponseTime: store.avgResponseTime,
      subscriptionTier,
      complaintCount,
      createdAt: store.createdAt,
    };

    const badges: BadgeKey[] = [];

    if (stats.isVerified)                                     badges.push(BADGE.VERIFIED);
    if (stats.totalSales >= 1000)                             badges.push(BADGE.SALES_1000);
    else if (stats.totalSales >= 500)                         badges.push(BADGE.SALES_500);
    else if (stats.totalSales >= 100)                         badges.push(BADGE.SALES_100);
    if (stats.avgRating >= 4.8 && stats.totalReviews >= 20)  badges.push(BADGE.EXCELLENT);
    if (stats.avgResponseTime !== null && stats.avgResponseTime <= 60) badges.push(BADGE.FAST_REPLY);
    if (subscriptionTier === 'PREMIUM' || subscriptionTier === 'ELITE') badges.push(BADGE.PREMIUM_SHOP);
    if (stats.totalSales >= 50 && stats.avgRating >= 4.5 && stats.complaintCount === 0) badges.push(BADGE.TRUSTED);
    if (stats.totalSales >= 200 && stats.avgRating >= 4.7 && stats.isVerified) badges.push(BADGE.TOP_SELLER);
    if (ageInDays <= 30 && stats.totalSales === 0)            badges.push(BADGE.NEW_SELLER);

    return badges;
  }

  // ── Compute reputation score (0–1000) ─────────────────────────────────────

  computeReputationScore(stats: Partial<StoreStats> & {
    unrespondedOrders?: number; badges?: BadgeKey[];
  }): number {
    let score = 500; // base

    // Rating impact (max ±200)
    if (stats.avgRating) {
      score += (stats.avgRating - 3) * 100; // 5★ = +200, 1★ = -200
    }

    // Sales volume (max +150)
    if (stats.totalSales) {
      if (stats.totalSales >= 1000) score += 150;
      else if (stats.totalSales >= 500) score += 100;
      else if (stats.totalSales >= 100) score += 60;
      else if (stats.totalSales >= 10) score += 20;
    }

    // Complaints (each confirmed complaint = -80)
    score -= (stats.complaintCount || 0) * 80;

    // Unresponded orders (-20 each, max -200)
    score -= Math.min((stats.unrespondedOrders || 0) * 20, 200);

    // Response time bonus (+50 if fast)
    if (stats.avgResponseTime !== null && stats.avgResponseTime !== undefined && stats.avgResponseTime <= 60) score += 50;

    // Badge bonuses
    const badgeBonus: Record<string, number> = {
      VERIFIED: 30, TOP_SELLER: 50, PREMIUM_SHOP: 20, EXCELLENT: 40,
      TRUSTED: 30, SALES_1000: 40, SALES_500: 25, SALES_100: 10,
    };
    for (const badge of (stats.badges || [])) {
      score += badgeBonus[badge] || 0;
    }

    return Math.max(0, Math.min(1000, Math.round(score)));
  }

  // ── Refresh badges + score for a store (call after order/review/complaint) ─

  async refreshStore(storeId: string): Promise<void> {
    try {
      const badges = await this.computeBadges(storeId);
      const store = await this.prisma.store.findUnique({ where: { id: storeId } });
      if (!store) return;

      const storeSeller = await this.prisma.seller.findFirst({ where: { stores: { some: { id: storeId } } } });
      const complaintCount = storeSeller ? await this.prisma.complaint.count({
        where: { sellerId: storeSeller.id, status: { in: ['CONFIRMED', 'RESOLVED_AGAINST_SELLER'] } },
      }) : 0;

      const unrespondedOrders = await this.prisma.order.count({
        where: { storeId, status: 'PENDING', createdAt: { lt: new Date(Date.now() - 24 * 3600000) } },
      });

      const score = this.computeReputationScore({
        avgRating: store.avgRating,
        totalSales: store.totalSales,
        complaintCount,
        unrespondedOrders,
        avgResponseTime: store.avgResponseTime,
        badges,
      });

      await this.prisma.store.update({
        where: { id: storeId },
        data: { badges: badges as any, reputationScore: score, lastBadgeUpdate: new Date() },
      });

      this.logger.log(`Store ${storeId} → badges=[${badges.join(',')}] score=${score}`);
    } catch (err) {
      this.logger.error(`refreshStore(${storeId}): ${err.message}`);
    }
  }

  // ── Refresh all active stores (cron-friendly) ────────────────────────────

  async refreshAll(): Promise<void> {
    const stores = await this.prisma.store.findMany({
      where: { isActive: true },
      select: { id: true },
    });
    for (const s of stores) {
      await this.refreshStore(s.id);
    }
    this.logger.log(`Refreshed badges for ${stores.length} stores`);
  }

  // ── Get label/color for a badge ──────────────────────────────────────────

  getBadgeMeta(badge: string): { label: string; color: string; icon: string } {
    const meta: Record<string, { label: string; color: string; icon: string }> = {
      VERIFIED:     { label: 'Vendeur Vérifié',   color: '#3B82F6', icon: '✓' },
      TOP_SELLER:   { label: 'Top Vendeur',        color: '#F59E0B', icon: '⭐' },
      PREMIUM_SHOP: { label: 'Boutique Premium',   color: '#8B5CF6', icon: '💎' },
      FAST_REPLY:   { label: 'Réponse Rapide',     color: '#10B981', icon: '⚡' },
      EXCELLENT:    { label: 'Excellent Service',  color: '#EF4444', icon: '🏆' },
      SALES_100:    { label: '100 Ventes+',        color: '#6366F1', icon: '🎯' },
      SALES_500:    { label: '500 Ventes+',        color: '#EC4899', icon: '🚀' },
      SALES_1000:   { label: '1000 Ventes+',       color: '#FF9900', icon: '👑' },
      NEW_SELLER:   { label: 'Nouveau Vendeur',    color: '#14B8A6', icon: '🌟' },
      TRUSTED:      { label: 'Vendeur de Confiance', color: '#059669', icon: '🛡️' },
    };
    return meta[badge] || { label: badge, color: '#6B7280', icon: '•' };
  }
}
