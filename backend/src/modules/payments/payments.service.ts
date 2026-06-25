import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService }   from '../../prisma/prisma.service';
import { MoncashService }  from '../moncash/moncash.service';
import { Decimal }         from '@prisma/client/runtime/library';

// ─────────────────────────────────────────────────────────────────────────────
// Paiements sur la plateforme = vendeurs seulement
//   • Abonnements  (STARTER / BUSINESS / PREMIUM / ELITE)
//   • Campagnes pub (Ad Campaigns)
// Les clients ne paient PAS sur la plateforme.
// ─────────────────────────────────────────────────────────────────────────────

@Injectable()
export class PaymentsService {
  constructor(
    private prisma:   PrismaService,
    private moncash:  MoncashService,
  ) {}

  // ── Admin : tous les paiements ────────────────────────────────────────────
  findAll(page = 1) {
    return this.prisma.payment.findMany({
      include: {
        subscription: { include: { plan: { select: { name: true, tier: true } }, seller: { include: { user: { select: { firstName: true, lastName: true } } } } } },
        adCampaign:   { select: { name: true, seller: { select: { user: { select: { firstName: true, lastName: true } } } } } },
      },
      skip: (page - 1) * 20, take: 20, orderBy: { createdAt: 'desc' },
    });
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  ABONNEMENTS
  // ══════════════════════════════════════════════════════════════════════════

  async initiateSubscriptionPayment(userId: string, planId: string) {
    const plan = await this.prisma.subscriptionPlan.findFirst({ where: { id: planId, isActive: true } });
    if (!plan) throw new NotFoundException('Plan introuvable ou inactif');

    const seller = await this.prisma.seller.findUnique({ where: { userId } });
    if (!seller) throw new NotFoundException('Profil vendeur introuvable');

    // Plan gratuit → activer directement sans MonCash
    if (Number(plan.priceHTG) === 0) {
      return this._activateSubscription(seller.id, planId, 0);
    }

    const amountHTG = Number(plan.priceHTG);

    // Créer l'abonnement en DB avec statut inactif, en attente de paiement
    const startDate = new Date();
    const endDate   = new Date(); endDate.setMonth(endDate.getMonth() + 1);

    const sub = await this.prisma.$transaction(async (tx) => {
      // Désactiver l'abonnement actif existant
      await tx.sellerSubscription.updateMany({ where: { sellerId: seller.id, isActive: true }, data: { isActive: false } });
      return tx.sellerSubscription.create({
        data: { sellerId: seller.id, planId, startDate, endDate, isActive: false },
      });
    });

    // Initier paiement MonCash
    const internalRef = `sub-${sub.id}`;
    const { redirectUrl } = await this.moncash.createPayment(amountHTG, internalRef);

    await this.prisma.payment.create({
      data: {
        subscriptionId: sub.id,
        method:         'MONCASH',
        status:         'PENDING',
        amountHTG:      new Decimal(amountHTG),
        transactionId:  internalRef,
        moncashOrderId: internalRef,
      },
    });

    return {
      redirect_url:    redirectUrl,
      subscription_id: sub.id,
      amount_htg:      amountHTG,
      plan:            plan.name,
    };
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  CAMPAGNES PUB
  // ══════════════════════════════════════════════════════════════════════════

  async initiateAdCampaignPayment(userId: string, campaignId: string) {
    const seller = await this.prisma.seller.findUnique({ where: { userId } });
    if (!seller) throw new NotFoundException('Profil vendeur introuvable');

    const campaign = await this.prisma.adCampaign.findFirst({
      where: { id: campaignId, sellerId: seller.id, status: 'PENDING_PAYMENT' },
    });
    if (!campaign) throw new NotFoundException('Campagne introuvable ou déjà payée');

    // Vérifier qu'aucun paiement existant n'est en cours
    if (campaign.paymentId) throw new ConflictException('Paiement déjà initié pour cette campagne');

    const amountHTG = Number(campaign.totalBudget);
    const internalRef = `ad-${campaign.id}`;
    const { redirectUrl } = await this.moncash.createPayment(amountHTG, internalRef);

    const payment = await this.prisma.payment.create({
      data: {
        method:         'MONCASH',
        status:         'PENDING',
        amountHTG:      new Decimal(amountHTG),
        transactionId:  internalRef,
        moncashOrderId: internalRef,
      },
    });

    await this.prisma.adCampaign.update({
      where: { id: campaignId },
      data:  { paymentId: payment.id },
    });

    return {
      redirect_url: redirectUrl,
      campaign_id:  campaignId,
      payment_id:   payment.id,
      amount_htg:   amountHTG,
    };
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  VÉRIFICATION MONCASH (abonnement OU campagne)
  // ══════════════════════════════════════════════════════════════════════════

  async verifySellerPayment(moncashTransactionId: string, userId: string) {
    // Anti-replay
    const existing = await this.prisma.payment.findUnique({ where: { moncashTransactionId } });
    if (existing?.status === 'COMPLETED') {
      throw new ConflictException('Transaksyon deja konfime — double crédit bloqué');
    }

    // Trouver le paiement par moncashOrderId (notre ref interne)
    // On cherche par transactionId car c'est ce qu'on a stocké
    const payment = await this.prisma.payment.findFirst({
      where:   { status: 'PENDING' },
      include: {
        subscription: { include: { seller: { select: { userId: true } } } },
        adCampaign:   { select: { id: true, sellerId: true, seller: { select: { userId: true } } } },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Confirmer avec MonCash — le montant vient de MonCash, jamais du client
    const mc = await this.moncash.verifyByTransactionId(moncashTransactionId);
    if (mc.message !== 'successful') {
      throw new BadRequestException(`Pèman echwe: ${mc.message}`);
    }

    const confirmedAmount = new Decimal(mc.cost);

    // Déterminer le type : abonnement ou campagne
    const pendingPayment = await this.prisma.payment.findFirst({
      where: {
        status: 'PENDING',
        OR: [
          { moncashOrderId: `sub-${payment?.subscriptionId ?? ''}` },
          { moncashOrderId: `ad-${payment?.adCampaign?.id ?? ''}` },
        ],
      },
      include: {
        subscription: true,
        adCampaign:   true,
      },
    });

    // Utiliser la ref interne pour trouver le bon paiement
    const refPayment = await this.prisma.payment.findFirst({
      where:   { status: 'PENDING', moncashTransactionId: null },
      include: { subscription: true, adCampaign: true },
    });

    if (!refPayment) throw new NotFoundException('Paiement pending introuvable');

    return this.prisma.$transaction(async (tx) => {
      // Confirmer le paiement
      await tx.payment.update({
        where: { id: refPayment.id },
        data: {
          status:              'COMPLETED',
          amountHTG:           confirmedAmount,
          moncashTransactionId,
          paidAt:              new Date(),
          gatewayData:         mc as any,
        },
      });

      // Activer l'abonnement si c'est un sub
      if (refPayment.subscriptionId) {
        await tx.sellerSubscription.update({
          where: { id: refPayment.subscriptionId },
          data:  { isActive: true },
        });
        return { type: 'subscription', amount_htg: Number(confirmedAmount), transaction_id: moncashTransactionId };
      }

      // Activer la campagne si c'est une pub
      if (refPayment.adCampaign) {
        await tx.adCampaign.update({
          where: { id: refPayment.adCampaign.id },
          data:  { status: 'PENDING_REVIEW' }, // admin doit reviewer avant activation
        });
        return { type: 'ad_campaign', amount_htg: Number(confirmedAmount), transaction_id: moncashTransactionId };
      }

      throw new BadRequestException('Type de paiement inconnu');
    });
  }

  // ── Vérification par orderId interne (depuis return URL) ─────────────────
  async verifyByOrderId(moncashOrderId: string, userId: string) {
    const mc = await this.moncash.verifyByOrderId(moncashOrderId);
    if (mc.message !== 'successful') throw new BadRequestException(`Pèman echwe: ${mc.message}`);
    return this.verifySellerPayment(mc.transaction_id, userId);
  }

  // ── Historique paiements du vendeur ──────────────────────────────────────
  async findMine(userId: string, page = 1) {
    const seller = await this.prisma.seller.findUnique({ where: { userId } });
    if (!seller) return { data: [], total: 0 };

    const [data, total] = await Promise.all([
      this.prisma.payment.findMany({
        where: {
          OR: [
            { subscription: { sellerId: seller.id } },
            { adCampaign:   { sellerId: seller.id } },
          ],
        },
        include: {
          subscription: { include: { plan: { select: { name: true, tier: true } } } },
          adCampaign:   { select: { name: true } },
        },
        skip: (page - 1) * 20, take: 20, orderBy: { createdAt: 'desc' },
      }),
      this.prisma.payment.count({
        where: {
          OR: [
            { subscription: { sellerId: seller.id } },
            { adCampaign:   { sellerId: seller.id } },
          ],
        },
      }),
    ]);

    return { data, total, page };
  }

  // ── Private : activer un abonnement gratuit ───────────────────────────────
  private async _activateSubscription(sellerId: string, planId: string, amount: number) {
    const startDate = new Date();
    const endDate   = new Date(); endDate.setMonth(endDate.getMonth() + 1);

    return this.prisma.$transaction(async (tx) => {
      await tx.sellerSubscription.updateMany({ where: { sellerId, isActive: true }, data: { isActive: false } });
      const sub = await tx.sellerSubscription.create({
        data: { sellerId, planId, startDate, endDate, isActive: true },
        include: { plan: true },
      });
      if (amount > 0) {
        await tx.payment.create({
          data: { subscriptionId: sub.id, method: 'MONCASH', status: 'COMPLETED', amountHTG: new Decimal(amount), paidAt: new Date() },
        });
      }
      return { type: 'subscription', subscription: sub, amount_htg: amount };
    });
  }
}
