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
// Paiements sur la plateforme = VENDEURS SEULEMENT
//   • Abonnements  (STARTER / BUSINESS / PREMIUM / ELITE)
//   • Campagnes pub (Ad Campaigns)
// Les clients ne paient PAS sur la plateforme.
// ─────────────────────────────────────────────────────────────────────────────

@Injectable()
export class PaymentsService {
  constructor(
    private prisma:  PrismaService,
    private moncash: MoncashService,
  ) {}

  // ── Admin : tous les paiements ────────────────────────────────────────────
  findAll(page = 1) {
    return this.prisma.payment.findMany({
      include: {
        subscription: {
          include: {
            plan:   { select: { name: true, tier: true } },
            seller: { include: { user: { select: { firstName: true, lastName: true } } } },
          },
        },
        adCampaign: {
          select: {
            name:   true,
            seller: { select: { user: { select: { firstName: true, lastName: true } } } },
          },
        },
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
      return this._activateFreeSubscription(seller.id, planId);
    }

    const amountHTG = Number(plan.priceHTG);
    const startDate = new Date();
    const endDate   = new Date(); endDate.setMonth(endDate.getMonth() + 1);

    // Créer abonnement inactif en attente de paiement
    const sub = await this.prisma.$transaction(async (tx) => {
      await tx.sellerSubscription.updateMany({
        where: { sellerId: seller.id, isActive: true },
        data:  { isActive: false },
      });
      return tx.sellerSubscription.create({
        data: { sellerId: seller.id, planId, startDate, endDate, isActive: false },
      });
    });

    // orderId envoyé à MonCash = référence interne que MonCash nous renverra dans "reference"
    const moncashRef = `sub-${sub.id}`;
    const { redirectUrl } = await this.moncash.createPayment(amountHTG, moncashRef);

    await this.prisma.payment.create({
      data: {
        subscriptionId: sub.id,
        method:         'MONCASH',
        status:         'PENDING',
        amountHTG:      new Decimal(amountHTG),
        transactionId:  moncashRef,
        moncashOrderId: moncashRef,
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
    if (campaign.paymentId) throw new ConflictException('Paiement déjà initié pour cette campagne');

    const amountHTG = Number(campaign.totalBudget);
    const moncashRef = `ad-${campaign.id}`;
    const { redirectUrl } = await this.moncash.createPayment(amountHTG, moncashRef);

    const payment = await this.prisma.payment.create({
      data: {
        method:         'MONCASH',
        status:         'PENDING',
        amountHTG:      new Decimal(amountHTG),
        transactionId:  moncashRef,
        moncashOrderId: moncashRef,
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
  //  VÉRIFICATION MONCASH — appelée après retour de MonCash
  //  MonCash redirige vers : dealpam.com?transactionId=2039151087
  //  MonCash retourne dans "reference" notre orderId interne (sub-xxx ou ad-xxx)
  // ══════════════════════════════════════════════════════════════════════════

  async verifySellerPayment(moncashTransactionId: string, userId: string) {
    // Anti-replay : déjà traité ?
    const alreadyDone = await this.prisma.payment.findUnique({
      where: { moncashTransactionId },
    });
    if (alreadyDone?.status === 'COMPLETED') {
      throw new ConflictException('Transaksyon deja konfime — double crédit bloqué');
    }

    // Appel MonCash pour confirmation
    const mc = await this.moncash.verifyByTransactionId(moncashTransactionId);
    if (mc.message !== 'successful') {
      throw new BadRequestException(`Pèman echwe: ${mc.message}`);
    }

    // mc.reference = l'orderId qu'on a envoyé à MonCash = notre ref interne (sub-xxx ou ad-xxx)
    const moncashRef = mc.reference;

    // Trouver le paiement en DB par moncashOrderId = notre référence interne
    const payment = await this.prisma.payment.findFirst({
      where:   { moncashOrderId: moncashRef, status: 'PENDING' },
      include: { subscription: true, adCampaign: true },
    });
    if (!payment) throw new NotFoundException(`Paiement pending introuvable pour ref ${moncashRef}`);

    const confirmedAmount = new Decimal(mc.cost); // montant vient de MonCash, jamais du client

    return this.prisma.$transaction(async (tx) => {
      // Marquer le paiement comme complété
      await tx.payment.update({
        where: { id: payment.id },
        data:  {
          status:              'COMPLETED',
          amountHTG:           confirmedAmount,
          moncashTransactionId,
          paidAt:              new Date(),
          gatewayData:         mc as any,
        },
      });

      // Activer l'abonnement
      if (payment.subscriptionId) {
        const sub = await tx.sellerSubscription.update({
          where:   { id: payment.subscriptionId },
          data:    { isActive: true },
          include: { seller: { include: { stores: { where: { isPrimary: true }, take: 1 } } }, plan: true },
        });
        // Badge tier : le plan payant déclenche isVerified si le vendeur est APPROVED
        if (sub.seller.status === 'APPROVED' && sub.seller.stores[0]) {
          const hasDocs = await this.prisma.businessDocument.count({
            where: { sellerId: sub.sellerId, isValid: true },
          });
          if (hasDocs > 0) {
            await tx.store.update({
              where: { id: sub.seller.stores[0].id },
              data:  { isVerified: true },
            });
          }
        }
        return {
          type:           'subscription',
          tier:           sub.plan.tier,
          amount_htg:     Number(confirmedAmount),
          transaction_id: moncashTransactionId,
          payer:          mc.payer,
        };
      }

      // Activer la campagne (→ admin review)
      if (payment.adCampaign) {
        await tx.adCampaign.update({
          where: { id: payment.adCampaign.id },
          data:  { status: 'PENDING_REVIEW' },
        });
        return {
          type:           'ad_campaign',
          amount_htg:     Number(confirmedAmount),
          transaction_id: moncashTransactionId,
          payer:          mc.payer,
        };
      }

      throw new BadRequestException('Type de paiement inconnu');
    });
  }

  // ── Vérifier par orderId MonCash (fallback — si transactionId pas dispo) ─
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

  // ── Activer un abonnement GRATUIT sans MonCash ────────────────────────────
  private async _activateFreeSubscription(sellerId: string, planId: string) {
    const startDate = new Date();
    const endDate   = new Date(); endDate.setMonth(endDate.getMonth() + 1);

    return this.prisma.$transaction(async (tx) => {
      await tx.sellerSubscription.updateMany({ where: { sellerId, isActive: true }, data: { isActive: false } });
      const sub = await tx.sellerSubscription.create({
        data:    { sellerId, planId, startDate, endDate, isActive: true },
        include: { plan: true },
      });
      return { type: 'subscription', subscription: sub, amount_htg: 0 };
    });
  }
}
