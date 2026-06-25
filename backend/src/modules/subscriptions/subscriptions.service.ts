import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class SubscriptionsService {
  constructor(private prisma: PrismaService) {}

  getPlans() { return this.prisma.subscriptionPlan.findMany({ where: { isActive: true }, orderBy: { priceHTG: 'asc' } }); }

  async subscribe(userId: string, planId: string) {
    const plan = await this.prisma.subscriptionPlan.findFirst({ where: { id: planId, isActive: true } });
    if (!plan) throw new NotFoundException('Plan introuvable ou inactif');

    const seller = await this.prisma.seller.findUnique({ where: { userId } });
    if (!seller) throw new NotFoundException('Profil vendeur introuvable');

    const startDate = new Date();
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + 1);

    return this.prisma.$transaction(async (tx) => {
      await tx.sellerSubscription.updateMany({ where: { sellerId: seller.id, isActive: true }, data: { isActive: false } });
      return tx.sellerSubscription.create({
        data: { sellerId: seller.id, planId, startDate, endDate, isActive: true },
        include: { plan: true }
      });
    });
  }

  async getMySubscription(userId: string) {
    const seller = await this.prisma.seller.findUnique({ where: { userId } });
    return this.prisma.sellerSubscription.findFirst({
      where: { sellerId: seller.id, isActive: true, endDate: { gt: new Date() } },
      include: { plan: true }
    });
  }

  getAll(page = 1) {
    return this.prisma.sellerSubscription.findMany({
      include: { seller: { include: { user: { select: { firstName: true, lastName: true, email: true } } } }, plan: true },
      skip: (page-1)*20, take: 20, orderBy: { createdAt: 'desc' }
    });
  }

  seedPlans() {
    const plans = [
      { tier: 'STARTER' as any, name: 'Plan Starter', priceHTG: 500, maxProducts: 50, maxImages: 5 },
      { tier: 'BUSINESS' as any, name: 'Plan Business', priceHTG: 1000, maxProducts: 130, maxImages: 10, hasVerifiedBadge: true, hasAdvancedStats: true },
      { tier: 'PREMIUM' as any, name: 'Plan Premium', priceHTG: 2500, maxProducts: 300, maxImages: 10, hasVerifiedBadge: true, hasPrioritySearch: true, hasAdvancedStats: true },
      { tier: 'ELITE' as any, name: 'Plan Elite', priceHTG: 5000, maxProducts: null, maxImages: 15, hasVerifiedBadge: true, hasEliteBadge: true, hasPrioritySearch: true, hasHomepageAd: true, hasAdvancedStats: true, hasAutoSponsored: true },
    ];
    return Promise.all(plans.map(p => this.prisma.subscriptionPlan.upsert({ where: { tier: p.tier }, create: p, update: p })));
  }
}
