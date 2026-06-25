import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

// Abonnements vendeurs — le paiement MonCash est géré par PaymentsService
// Ce service gère uniquement la lecture des plans et abonnements actifs

@Injectable()
export class SubscriptionsService {
  constructor(private prisma: PrismaService) {}

  // Plans disponibles (du moins cher au plus cher)
  getPlans() {
    return this.prisma.subscriptionPlan.findMany({
      where:   { isActive: true },
      orderBy: { priceHTG: 'asc' },
    });
  }

  // Abonnement actif du vendeur
  async getMySubscription(userId: string) {
    const seller = await this.prisma.seller.findUnique({ where: { userId } });
    if (!seller) return null;
    return this.prisma.sellerSubscription.findFirst({
      where:   { sellerId: seller.id, isActive: true, endDate: { gt: new Date() } },
      include: { plan: true },
    });
  }

  // Admin : tous les abonnements
  getAll(page = 1) {
    return this.prisma.sellerSubscription.findMany({
      include: {
        seller: { include: { user: { select: { firstName: true, lastName: true, email: true } } } },
        plan:   true,
      },
      skip: (page - 1) * 20, take: 20, orderBy: { createdAt: 'desc' },
    });
  }

  // Seed des plans (appelé une fois)
  seedPlans() {
    const plans = [
      { tier: 'STARTER'  as any, name: 'Starter',  priceHTG: 0,    maxProducts: 10,  maxImages: 3,  description: 'Gratis pou kòmanse' },
      { tier: 'BUSINESS' as any, name: 'Business', priceHTG: 500,  maxProducts: 50,  maxImages: 8,  hasVerifiedBadge: true, hasAdvancedStats: true, description: '500 HTG / mwa' },
      { tier: 'PREMIUM'  as any, name: 'Premium',  priceHTG: 1500, maxProducts: 200, maxImages: 15, hasVerifiedBadge: true, hasPrioritySearch: true, hasAdvancedStats: true, hasAutoSponsored: true, description: '1 500 HTG / mwa' },
      { tier: 'ELITE'    as any, name: 'Elite',    priceHTG: 3500, maxProducts: null, maxImages: 25, hasVerifiedBadge: true, hasEliteBadge: true, hasPrioritySearch: true, hasHomepageAd: true, hasAdvancedStats: true, hasAutoSponsored: true, description: '3 500 HTG / mwa' },
    ];
    return Promise.all(
      plans.map(p => this.prisma.subscriptionPlan.upsert({ where: { tier: p.tier }, create: p, update: p }))
    );
  }
}
