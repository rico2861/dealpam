import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

const TRIAL_DURATION_MS = 30 * 24 * 60 * 60 * 1000; // 30 jours
const TRIAL_TIER = 'BUSINESS'; // plan "standard" offert pendant l'essai gratuit

// Abonnements vendeurs — le paiement MonCash est géré par PaymentsService
// Ce service gère la lecture/gestion des plans, l'essai gratuit et les abonnements actifs

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

  // ── Admin : CRUD des plans ───────────────────────────────────────────────
  getAllPlansAdmin() {
    return this.prisma.subscriptionPlan.findMany({ orderBy: { priceHTG: 'asc' } });
  }

  createPlan(dto: any) {
    return this.prisma.subscriptionPlan.create({
      data: {
        tier:                  dto.tier,
        name:                  dto.name,
        priceHTG:              dto.priceHTG,
        maxProducts:           dto.maxProducts ?? null,
        maxImages:             dto.maxImages ?? 5,
        maxStores:             dto.maxStores ?? 1,
        hasVerifiedBadge:      !!dto.hasVerifiedBadge,
        hasEliteBadge:         !!dto.hasEliteBadge,
        hasPrioritySearch:     !!dto.hasPrioritySearch,
        hasHomepageAd:         !!dto.hasHomepageAd,
        hasAdvancedStats:      !!dto.hasAdvancedStats,
        hasAutoSponsored:      !!dto.hasAutoSponsored,
        description:           dto.description ?? null,
        isActive:              dto.isActive ?? true,
        annualDiscountPercent: dto.annualDiscountPercent ?? 25,
      },
    });
  }

  updatePlan(id: string, dto: any) {
    const data: any = {};
    for (const key of [
      'name', 'priceHTG', 'maxProducts', 'maxImages', 'maxStores',
      'hasVerifiedBadge', 'hasEliteBadge', 'hasPrioritySearch', 'hasHomepageAd',
      'hasAdvancedStats', 'hasAutoSponsored', 'description', 'isActive',
      'annualDiscountPercent',
    ]) {
      if (dto[key] !== undefined) data[key] = dto[key];
    }
    return this.prisma.subscriptionPlan.update({ where: { id }, data });
  }

  async deletePlan(id: string) {
    const inUse = await this.prisma.sellerSubscription.count({ where: { planId: id, isActive: true } });
    if (inUse > 0) throw new BadRequestException('Ce plan a des abonnés actifs, impossible de le supprimer.');
    return this.prisma.subscriptionPlan.delete({ where: { id } });
  }

  // ── Essai gratuit 30 jours — une seule fois par personne ────────────────
  // Vérifie téléphone, email ET NIF : si l'un des trois correspond à un essai
  // déjà utilisé, on refuse (empêche de recréer un compte avec un nouvel email
  // pour recycler l'essai).
  async startTrial(userId: string) {
    const seller = await this.prisma.seller.findUnique({
      where: { userId },
      include: { user: true },
    });
    if (!seller) throw new NotFoundException('Vendeur introuvable');

    const existingActive = await this.prisma.sellerSubscription.findFirst({
      where: { sellerId: seller.id, isActive: true, endDate: { gt: new Date() } },
    });
    if (existingActive) throw new ConflictException('Vous avez déjà un abonnement actif.');

    const { phone, email } = seller.user;
    const nif = seller.nif;

    const orConditions: any[] = [];
    if (phone) orConditions.push({ phone });
    if (email) orConditions.push({ email });
    if (nif)   orConditions.push({ nif });

    if (orConditions.length > 0) {
      const alreadyUsed = await this.prisma.trialUsage.findFirst({ where: { OR: orConditions } });
      if (alreadyUsed) {
        throw new ConflictException(
          "Vous avez déjà bénéficié de l'essai gratuit avec ce numéro, cet email ou ce NIF. L'essai n'est disponible qu'une seule fois."
        );
      }
    }

    const plan = await this.prisma.subscriptionPlan.findUnique({ where: { tier: TRIAL_TIER as any } });
    if (!plan) throw new NotFoundException('Plan d\'essai introuvable');

    const startDate = new Date();
    const endDate   = new Date(startDate.getTime() + TRIAL_DURATION_MS);

    const [subscription] = await this.prisma.$transaction([
      this.prisma.sellerSubscription.create({
        data: {
          sellerId: seller.id, planId: plan.id, startDate, endDate,
          isActive: true, autoRenew: false, billingCycle: 'MONTHLY', isTrial: true,
        },
        include: { plan: true },
      }),
      this.prisma.trialUsage.create({
        data: { sellerId: seller.id, phone: phone || null, email: email || null, nif: nif || null },
      }),
    ]);

    return subscription;
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
