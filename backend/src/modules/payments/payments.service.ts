import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService }   from '../../prisma/prisma.service';
import { MoncashService }  from '../moncash/moncash.service';
import { CouponsService }  from '../coupons/coupons.service';
import { MoncashTransactionsService } from '../moncash-transactions/moncash-transactions.service';
import { NotificationsService } from '../notifications/notifications.service';
import { WalletService }   from '../wallet/wallet.service';
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
    private prisma:    PrismaService,
    private moncash:   MoncashService,
    private coupons:   CouponsService,
    private moncashTx: MoncashTransactionsService,
    private notifications: NotificationsService,
    private wallet:    WalletService,
  ) {}

  // ── Avertit tous les admins qu'un paiement a un montant qui ne correspond
  // pas au plan/campagne demandé — nécessite une activation manuelle. ───────
  private async notifyAdminsOfMismatch(payment: any, expected: number, received: number, moncashTransactionId: string) {
    const admins = await this.prisma.user.findMany({
      where: { role: { in: ['ADMIN', 'SUPER_ADMIN'] } },
      select: { id: true },
    });
    const label = payment.subscriptionId ? 'abonnement' : 'campagne pub';
    const body = `Paiement MonCash (${moncashTransactionId}) pour un(e) ${label} : attendu ${expected} HTG, reçu ${received} HTG. Vérifiez et activez manuellement le bon plan/campagne si le paiement est légitime.`;
    await Promise.all(admins.map(a =>
      this.notifications.create(a.id, 'Écart de montant — activation manuelle requise', body, 'PAYMENT_AMOUNT_MISMATCH').catch(() => null),
    ));
    await this.prisma.auditLog.create({
      data: {
        action: 'PAYMENT_AMOUNT_MISMATCH',
        entity: payment.subscriptionId ? 'SellerSubscription' : 'AdCampaign',
        entityId: payment.subscriptionId ?? payment.adCampaign?.id ?? undefined,
        newValues: { expected, received, moncashTransactionId, paymentId: payment.id } as any,
      },
    }).catch(() => null);
  }

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

  async initiateSubscriptionPayment(
    userId: string, planId: string,
    billingCycle: 'MONTHLY' | 'ANNUAL' = 'MONTHLY',
    couponCode?: string,
  ) {
    const plan = await this.prisma.subscriptionPlan.findFirst({ where: { id: planId, isActive: true } });
    if (!plan) throw new NotFoundException('Plan introuvable ou inactif');

    const seller = await this.prisma.seller.findUnique({ where: { userId } });
    if (!seller) throw new NotFoundException('Profil vendeur introuvable');

    // Abonnement en cours (payé) : le changement ne peut pas être immédiat,
    // il prend effet à la fin de la période déjà payée — jamais de rétroactif.
    const current = await this.prisma.sellerSubscription.findFirst({
      where: { sellerId: seller.id, isActive: true, endDate: { gt: new Date() } },
    });

    if (current) {
      if (current.planId === planId) {
        throw new ConflictException('Vous êtes déjà sur ce plan pour la période en cours.');
      }

      const existingScheduled = await this.prisma.sellerSubscription.findFirst({
        where: { sellerId: seller.id, isActive: false, startDate: { gte: current.endDate } },
        include: { payment: true },
      });
      if (existingScheduled?.payment?.status === 'COMPLETED') {
        throw new ConflictException(
          "Un changement de plan est déjà programmé et payé pour la prochaine période. Contactez le support pour le modifier."
        );
      }
      // Changement précédemment programmé mais jamais payé (abandonné) : on le remplace.
      if (existingScheduled) {
        await this.prisma.sellerSubscription.delete({ where: { id: existingScheduled.id } });
      }

      return this._scheduleplanChange(seller.id, current, plan, billingCycle, userId, couponCode);
    }

    // Aucun abonnement actif → activation immédiate (premier abonnement, ou après expiration)
    if (Number(plan.priceHTG) === 0) {
      return this._activateFreeSubscription(seller.id, planId);
    }
    return this._payAndActivateNow(seller.id, plan, billingCycle, userId, couponCode);
  }

  // ── Choisir un plan différent alors qu'un abonnement payé est en cours ────
  // Ne modifie PAS la période active : crée le prochain cycle (payé maintenant,
  // démarre à la fin du cycle courant) et laisse le cron l'activer à endDate.
  private async _scheduleplanChange(
    sellerId: string, current: { id: string; endDate: Date },
    plan: { id: string; priceHTG: any; annualDiscountPercent: number | null; name: string },
    billingCycle: 'MONTHLY' | 'ANNUAL', userId: string, couponCode?: string,
  ) {
    const startDate = new Date(current.endDate);
    const endDate    = new Date(startDate);
    const isAnnual   = billingCycle === 'ANNUAL';
    if (isAnnual) endDate.setFullYear(endDate.getFullYear() + 1);
    else          endDate.setMonth(endDate.getMonth() + 1);

    // Un changement de plan programmé annule une éventuelle annulation en cours —
    // le vendeur a choisi de continuer, juste sur un autre plan.
    await this.prisma.sellerSubscription.update({
      where: { id: current.id },
      data:  { cancelAtPeriodEnd: false },
    });

    if (Number(plan.priceHTG) === 0) {
      const scheduled = await this.prisma.sellerSubscription.create({
        data: { sellerId, planId: plan.id, startDate, endDate, isActive: false, billingCycle },
        include: { plan: true },
      });
      return { type: 'subscription_scheduled', subscription: scheduled, amount_htg: 0, effective_date: startDate };
    }

    const monthlyPrice = Number(plan.priceHTG);
    const discountPct  = plan.annualDiscountPercent ?? 25;
    let amountHTG = isAnnual
      ? Math.round(monthlyPrice * 12 * (1 - discountPct / 100))
      : monthlyPrice;

    let couponId: string | null = null;
    let couponDiscount = 0;
    if (couponCode) {
      const { coupon, discount } = await this.coupons.validate(couponCode, 'SUBSCRIPTION', userId, amountHTG);
      couponId = coupon.id;
      couponDiscount = discount;
      amountHTG = Math.max(0, amountHTG - discount);
    }

    const fullyCovered = amountHTG === 0 && couponId;
    const scheduled = await this.prisma.sellerSubscription.create({
      data: { sellerId, planId: plan.id, startDate, endDate, isActive: false, billingCycle },
      include: { plan: true },
    });

    if (fullyCovered) {
      await this.prisma.payment.create({
        data: {
          subscriptionId: scheduled.id, method: 'MONCASH', status: 'COMPLETED',
          amountHTG: new Decimal(0), transactionId: `coupon-${scheduled.id}`,
          moncashOrderId: `coupon-${scheduled.id}`, paidAt: new Date(),
          couponId, couponDiscountHTG: new Decimal(couponDiscount),
        },
      });
      await this.coupons.redeem(couponId!, userId, 'SUBSCRIPTION', scheduled.id, couponDiscount);
      return { type: 'subscription_scheduled', subscription: scheduled, amount_htg: 0, effective_date: startDate };
    }

    const moncashRef = `sub-${scheduled.id}`;
    const { redirectUrl } = await this.moncash.createPayment(amountHTG, moncashRef);

    await this.prisma.payment.create({
      data: {
        subscriptionId:    scheduled.id,
        method:            'MONCASH',
        status:            'PENDING',
        amountHTG:         new Decimal(amountHTG),
        transactionId:     moncashRef,
        moncashOrderId:    moncashRef,
        couponId:          couponId ?? undefined,
        couponDiscountHTG: couponId ? new Decimal(couponDiscount) : undefined,
      },
    });

    return {
      redirect_url:    redirectUrl,
      subscription_id: scheduled.id,
      amount_htg:      amountHTG,
      plan:            plan.name,
      effective_date:  startDate,
    };
  }

  // ── Premier abonnement (ou reprise après expiration totale) — immédiat ───
  private async _payAndActivateNow(
    sellerId: string,
    plan: { id: string; priceHTG: any; annualDiscountPercent: number | null; name: string },
    billingCycle: 'MONTHLY' | 'ANNUAL', userId: string, couponCode?: string,
  ) {
    const monthlyPrice = Number(plan.priceHTG);
    const isAnnual      = billingCycle === 'ANNUAL';
    const discountPct   = plan.annualDiscountPercent ?? 25;
    let amountHTG = isAnnual
      ? Math.round(monthlyPrice * 12 * (1 - discountPct / 100))
      : monthlyPrice;

    let couponId: string | null = null;
    let couponDiscount = 0;
    if (couponCode) {
      const { coupon, discount } = await this.coupons.validate(couponCode, 'SUBSCRIPTION', userId, amountHTG);
      couponId = coupon.id;
      couponDiscount = discount;
      amountHTG = Math.max(0, amountHTG - discount);
    }

    const startDate = new Date();
    const endDate   = new Date();
    if (isAnnual) endDate.setFullYear(endDate.getFullYear() + 1);
    else          endDate.setMonth(endDate.getMonth() + 1);

    const fullyCovered = amountHTG === 0 && couponId;
    const sub = await this.prisma.$transaction(async (tx) => {
      await tx.sellerSubscription.updateMany({
        where: { sellerId, isActive: true },
        data:  { isActive: false },
      });
      return tx.sellerSubscription.create({
        data: { sellerId, planId: plan.id, startDate, endDate, isActive: !!fullyCovered, billingCycle },
        include: { plan: true },
      });
    });

    if (fullyCovered) {
      await this.coupons.redeem(couponId!, userId, 'SUBSCRIPTION', sub.id, couponDiscount);
      return { type: 'subscription', subscription: sub, amount_htg: 0, coupon_discount_htg: couponDiscount };
    }

    // orderId envoyé à MonCash = référence interne que MonCash nous renverra dans "reference"
    const moncashRef = `sub-${sub.id}`;
    const { redirectUrl } = await this.moncash.createPayment(amountHTG, moncashRef);

    await this.prisma.payment.create({
      data: {
        subscriptionId:    sub.id,
        method:            'MONCASH',
        status:            'PENDING',
        amountHTG:         new Decimal(amountHTG),
        transactionId:     moncashRef,
        moncashOrderId:    moncashRef,
        couponId:          couponId ?? undefined,
        couponDiscountHTG: couponId ? new Decimal(couponDiscount) : undefined,
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

  // Note : plus de paramètre userId — MonCash peut déconnecter le navigateur
  // au retour (session/JWT expiré), donc cette vérification ne doit JAMAIS
  // dépendre de l'identité de l'appelant. L'ancrage de sécurité est la
  // confirmation server-to-server auprès de MonCash + le rattachement au
  // Payment PENDING via moncashOrderId (jamais fourni par le client).
  async verifySellerPayment(moncashTransactionId: string) {
    // Anti-replay (verrou historique sur la table Payment elle-même)
    const alreadyDone = await this.prisma.payment.findUnique({
      where: { moncashTransactionId },
    });
    if (alreadyDone?.status === 'COMPLETED') {
      throw new ConflictException('Transaksyon deja konfime — double crédit bloqué');
    }

    // Appel MonCash pour confirmation
    let mc;
    try {
      mc = await this.moncash.verifyByTransactionId(moncashTransactionId);
    } catch (err: any) {
      await this.moncashTx.record({
        scenario: 'subscription', status: 'FAILED', mc: null,
        failReason: err?.message ?? 'not_found',
      });
      throw err;
    }

    if (mc.message !== 'successful') {
      await this.moncashTx.record({ scenario: 'subscription', status: 'FAILED', mc, failReason: mc.message });
      throw new BadRequestException(`Pèman echwe: ${mc.message}`);
    }

    // Verrou anti-double-crédit centralisé : le premier appelant "gagne" le droit de créditer.
    const alreadyCredited = await this.moncashTx.isAlreadyCredited(mc.transaction_id);
    if (alreadyCredited) {
      await this.moncashTx.record({ scenario: 'subscription', status: 'SUCCESS', mc, failReason: null });
      throw new ConflictException('Transaksyon deja konfime — double crédit bloqué');
    }

    // mc.reference = l'orderId qu'on a envoyé à MonCash = notre ref interne (sub-xxx, ad-xxx ou WALLET-xxx)
    const moncashRef = mc.reference;

    // Recharge wallet : déterminé ici via le préfixe de la référence renvoyée par MonCash
    // lui-même (jamais fourni par le client), et non via un flag localStorage côté front —
    // ce flag est scopé par origine et peut être perdu si le retour MonCash atterrit sur un
    // autre host (www vs non-www, session/onglet différent, etc.), ce qui envoyait alors la
    // vérification vers ce flux abonnement/campagne par erreur ("Paiement pending introuvable").
    if (moncashRef?.startsWith('WALLET-')) {
      return this.wallet.creditFromMc(mc);
    }

    // Trouver le paiement en DB par moncashOrderId = notre référence interne
    const payment = await this.prisma.payment.findFirst({
      where:   { moncashOrderId: moncashRef, status: 'PENDING' },
      include: { subscription: true, adCampaign: true },
    });
    if (!payment) {
      await this.moncashTx.record({ scenario: 'subscription', status: 'FAILED', mc, failReason: `pending_payment_not_found:${moncashRef}` });
      throw new NotFoundException(`Paiement pending introuvable pour ref ${moncashRef}`);
    }

    await this.moncashTx.record({ scenario: payment.adCampaign ? 'ad_campaign' : 'subscription', status: 'SUCCESS', mc, orderId: moncashRef });
    const claimed = await this.moncashTx.claimCredit(mc.transaction_id);
    if (!claimed) {
      throw new ConflictException('Transaksyon deja konfime — double crédit bloqué');
    }

    const confirmedAmount = new Decimal(mc.cost); // montant vient de MonCash, jamais du client
    const expectedAmount = Number(payment.amountHTG);
    // Tolérance de 2% pour d'éventuels arrondis MonCash — au-delà, le montant
    // réellement reçu ne correspond pas au plan/campagne demandé : on encaisse
    // le paiement (il a bien été reçu) mais on N'ACTIVE PAS automatiquement,
    // le temps qu'un admin vérifie et active manuellement le bon plan.
    const amountMismatch = Number(confirmedAmount) < expectedAmount * 0.98;

    if (amountMismatch) {
      await this.prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: 'COMPLETED',
          amountHTG: confirmedAmount,
          moncashTransactionId,
          paidAt: new Date(),
          gatewayData: mc as any,
          failureReason: `AMOUNT_MISMATCH: attendu ${expectedAmount} HTG, reçu ${Number(confirmedAmount)} HTG — activation en attente de vérification admin`,
        },
      });
      await this.notifyAdminsOfMismatch(payment, expectedAmount, Number(confirmedAmount), moncashTransactionId);
      return {
        type: 'payment_review',
        amount_htg: Number(confirmedAmount),
        expected_htg: expectedAmount,
        transaction_id: moncashTransactionId,
        payer: mc.payer,
        message: "Paiement reçu mais le montant ne correspond pas exactement au plan demandé — un administrateur va vérifier et activer votre abonnement sous peu.",
      };
    }

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

      // Activer l'abonnement — sauf s'il s'agit d'un changement de plan programmé
      // (startDate future) : le paiement est capturé maintenant, l'activation
      // effective se fera au cron à la fin de la période en cours.
      if (payment.subscriptionId) {
        const isImmediate = payment.subscription!.startDate <= new Date();
        const sub = await tx.sellerSubscription.update({
          where:   { id: payment.subscriptionId },
          data:    isImmediate ? { isActive: true } : {},
          include: { seller: { include: { stores: { where: { isPrimary: true }, take: 1 } } }, plan: true },
        });
        // Badge tier : le plan payant déclenche isVerified si le vendeur est APPROVED
        if (isImmediate && sub.seller.status === 'APPROVED' && sub.seller.stores[0]) {
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

        // Enregistrer l'utilisation du coupon (si un coupon avait été appliqué à l'initiation)
        // userId dérivé de la relation seller→user (jamais du client, cf. commentaire ci-dessus).
        if (payment.couponId) {
          await tx.coupon.update({ where: { id: payment.couponId }, data: { usedCount: { increment: 1 } } });
          await tx.couponRedemption.create({
            data: {
              couponId: payment.couponId, userId: sub.seller.userId, context: 'SUBSCRIPTION',
              referenceId: sub.id, amountDiscounted: payment.couponDiscountHTG ?? 0,
            },
          });
        }

        return {
          type:           isImmediate ? 'subscription' : 'subscription_scheduled',
          tier:           sub.plan.tier,
          amount_htg:     Number(confirmedAmount),
          transaction_id: moncashTransactionId,
          payer:          mc.payer,
          effective_date: isImmediate ? undefined : sub.startDate,
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
  async verifyByOrderId(moncashOrderId: string) {
    const mc = await this.moncash.verifyByOrderId(moncashOrderId);
    if (mc.message !== 'successful') throw new BadRequestException(`Pèman echwe: ${mc.message}`);
    return this.verifySellerPayment(mc.transaction_id);
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
