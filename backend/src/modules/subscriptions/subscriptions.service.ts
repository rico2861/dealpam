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
        maxServices:           dto.maxServices ?? null,
        maxImages:             dto.maxImages ?? 5,
        maxStores:             dto.maxStores ?? 1,
        hasVerifiedBadge:      !!dto.hasVerifiedBadge,
        hasEliteBadge:         !!dto.hasEliteBadge,
        hasPrioritySearch:     !!dto.hasPrioritySearch,
        hasHomepageAd:         !!dto.hasHomepageAd,
        hasAdvancedStats:      !!dto.hasAdvancedStats,
        hasAutoSponsored:      !!dto.hasAutoSponsored,
        hasKeywordTargeting:   !!dto.hasKeywordTargeting,
        description:           dto.description ?? null,
        isActive:              dto.isActive ?? true,
        isPopular:             !!dto.isPopular,
        originalPriceHTG:      dto.originalPriceHTG ?? null,
        maxPromoProducts:      dto.maxPromoProducts ?? 0,
        maxCarouselProducts:   dto.maxCarouselProducts ?? 0,
        annualDiscountPercent: dto.annualDiscountPercent ?? 25,
      },
    });
  }

  updatePlan(id: string, dto: any) {
    const data: any = {};
    for (const key of [
      'name', 'priceHTG', 'maxProducts', 'maxServices', 'maxImages', 'maxStores',
      'hasVerifiedBadge', 'hasEliteBadge', 'hasPrioritySearch', 'hasHomepageAd',
      'hasAdvancedStats', 'hasAutoSponsored', 'hasKeywordTargeting', 'description', 'isActive',
      'isPopular', 'originalPriceHTG', 'maxPromoProducts', 'maxCarouselProducts',
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

  // ── Garantit qu'un vendeur a toujours au moins le plan gratuit Starter ────
  // Sans ça, un vendeur qui n'a jamais démarré d'essai ni payé un plan se
  // retrouve avec zéro abonnement en base et se fait bloquer même pour les
  // 2 produits gratuits auxquels il a droit sans engagement. Appelé à la
  // création du compte vendeur ; no-op si un abonnement actif existe déjà.
  async ensureBaselinePlan(sellerId: string) {
    const existing = await this.prisma.sellerSubscription.findFirst({
      where: { sellerId, isActive: true, endDate: { gt: new Date() } },
    });
    if (existing) return existing;

    const starter = await this.prisma.subscriptionPlan.findUnique({ where: { tier: 'STARTER' as any } });
    if (!starter) return null;

    const startDate = new Date();
    const endDate = new Date(startDate);
    endDate.setFullYear(endDate.getFullYear() + 100); // plan gratuit, pas de renouvellement à gérer

    return this.prisma.sellerSubscription.create({
      data: { sellerId, planId: starter.id, startDate, endDate, isActive: true, billingCycle: 'MONTHLY' },
    });
  }

  // ── Admin : activer un plan manuellement pour un vendeur ─────────────────
  // Utilisé quand un paiement a été reçu mais avec un montant qui ne
  // correspond pas exactement au plan (cf. PaymentsService.notifyAdminsOfMismatch),
  // ou pour tout geste commercial exceptionnel. Toujours tracé (AuditLog +
  // Payment MANUAL) avec le motif fourni par l'admin.
  async adminActivatePlan(adminUserId: string, sellerId: string, planId: string, reason: string, billingCycle: 'MONTHLY' | 'ANNUAL' = 'MONTHLY') {
    if (!reason?.trim()) throw new BadRequestException('Un motif est requis pour activer un plan manuellement.');

    const seller = await this.prisma.seller.findUnique({ where: { id: sellerId } });
    if (!seller) throw new NotFoundException('Vendeur introuvable');
    const plan = await this.prisma.subscriptionPlan.findUnique({ where: { id: planId } });
    if (!plan) throw new NotFoundException('Plan introuvable');

    const startDate = new Date();
    const endDate = new Date(startDate);
    if (billingCycle === 'ANNUAL') endDate.setFullYear(endDate.getFullYear() + 1);
    else endDate.setMonth(endDate.getMonth() + 1);

    const result = await this.prisma.$transaction(async (tx) => {
      await tx.sellerSubscription.updateMany({
        where: { sellerId, isActive: true },
        data:  { isActive: false },
      });
      const sub = await tx.sellerSubscription.create({
        data: { sellerId, planId, startDate, endDate, isActive: true, billingCycle },
        include: { plan: true },
      });
      await tx.payment.create({
        data: {
          subscriptionId: sub.id,
          method: 'MANUAL',
          status: 'COMPLETED',
          amountHTG: plan.priceHTG,
          transactionId: `admin-activate-${sub.id}`,
          paidAt: new Date(),
          gatewayData: { activatedByAdminUserId: adminUserId, reason } as any,
        },
      });
      await tx.auditLog.create({
        data: {
          userId: adminUserId,
          action: 'ADMIN_ACTIVATE_SUBSCRIPTION',
          entity: 'SellerSubscription',
          entityId: sub.id,
          newValues: { sellerId, planId, planName: plan.name, billingCycle, reason } as any,
        },
      });
      return sub;
    });

    return result;
  }

  // Abonnement actif du vendeur — inclut le changement de plan programmé
  // (payé mais pas encore démarré) s'il y en a un, pour affichage côté vendeur.
  async getMySubscription(userId: string) {
    const seller = await this.prisma.seller.findUnique({ where: { userId } });
    if (!seller) return null;
    const current = await this.prisma.sellerSubscription.findFirst({
      where:   { sellerId: seller.id, isActive: true, endDate: { gt: new Date() } },
      include: { plan: true },
    });
    if (!current) return null;

    const scheduled = await this.prisma.sellerSubscription.findFirst({
      where:   { sellerId: seller.id, isActive: false, startDate: { gte: current.endDate } },
      include: { plan: true, payment: true },
      orderBy: { startDate: 'asc' },
    });
    // N'afficher "changement programmé" que si le paiement est réellement
    // confirmé (COMPLETED) — sinon un changement jamais payé (redirection
    // MonCash abandonnée, onglet fermé…) apparaissait comme "programmé" alors
    // que rien n'avait été payé.
    const scheduledPaid = scheduled?.payment?.status === 'COMPLETED' ? scheduled : null;

    return { ...current, scheduledPlan: scheduledPaid ? scheduledPaid.plan : null, scheduledStartDate: scheduledPaid ? scheduledPaid.startDate : null };
  }

  // ── Annulation : reste actif jusqu'à endDate, puis n'est pas renouvelé ────
  // Pas de remboursement ni d'annulation rétroactive : le mois déjà payé est conservé.
  async cancelSubscription(userId: string) {
    const seller = await this.prisma.seller.findUnique({ where: { userId } });
    if (!seller) throw new NotFoundException('Vendeur introuvable');

    const current = await this.prisma.sellerSubscription.findFirst({
      where: { sellerId: seller.id, isActive: true, endDate: { gt: new Date() } },
    });
    if (!current) throw new NotFoundException('Aucun abonnement actif à annuler.');

    const paidChange = await this.prisma.sellerSubscription.findFirst({
      where: { sellerId: seller.id, isActive: false, startDate: { gte: current.endDate } },
      include: { payment: true },
    });
    if (paidChange?.payment?.status === 'COMPLETED') {
      throw new ConflictException(
        "Un changement de plan est déjà programmé et payé pour la prochaine période. Contactez le support pour l'annuler."
      );
    }
    // Changement programmé mais jamais payé (abandonné) : on le retire, l'annulation prime.
    if (paidChange) {
      await this.prisma.sellerSubscription.delete({ where: { id: paidChange.id } });
    }

    return this.prisma.sellerSubscription.update({
      where: { id: current.id },
      data:  { cancelAtPeriodEnd: true },
      include: { plan: true },
    });
  }

  // ── Revenir sur une annulation avant la fin de la période payée ──────────
  async undoCancelSubscription(userId: string) {
    const seller = await this.prisma.seller.findUnique({ where: { userId } });
    if (!seller) throw new NotFoundException('Vendeur introuvable');

    const current = await this.prisma.sellerSubscription.findFirst({
      where: { sellerId: seller.id, isActive: true, endDate: { gt: new Date() }, cancelAtPeriodEnd: true },
    });
    if (!current) throw new NotFoundException("Aucune annulation en cours à annuler.");

    return this.prisma.sellerSubscription.update({
      where: { id: current.id },
      data:  { cancelAtPeriodEnd: false },
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
