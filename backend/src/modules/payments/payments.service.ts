import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { MoncashService } from '../moncash/moncash.service';
import { ConfigService } from '@nestjs/config';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class PaymentsService {
  constructor(
    private prisma: PrismaService,
    private moncash: MoncashService,
    private config: ConfigService,
  ) {}

  // ── Admin : liste tous les paiements ─────────────────────────────────────
  findAll(page = 1) {
    return this.prisma.payment.findMany({
      include: {
        order: {
          include: { user: { select: { firstName: true, lastName: true } } },
        },
      },
      skip: (page - 1) * 20,
      take: 20,
      orderBy: { createdAt: 'desc' },
    });
  }

  // ── Initier un paiement MonCash pour une commande ─────────────────────────
  async initiateOrderPayment(orderId: string, userId: string) {
    // Vérification ownership + statut
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, userId },
    });
    if (!order) throw new NotFoundException('Commande introuvable');
    if (order.status !== 'PENDING') throw new ForbiddenException('Commande déjà traitée');

    // Vérifier qu'aucun paiement pending n'existe déjà
    const existing = await this.prisma.payment.findUnique({ where: { orderId } });
    if (existing?.status === 'COMPLETED') {
      throw new ConflictException('Commande déjà payée');
    }

    const amountHTG = Number(order.totalHTG);

    // Créer le paiement MonCash (le transactionId est notre référence interne)
    const internalRef = `dealpam-${orderId}`;
    const { redirectUrl, paymentToken } = await this.moncash.createPayment(
      amountHTG,
      internalRef,
    );

    // Créer/mettre à jour le paiement en DB avec statut PENDING
    const payment = await this.prisma.payment.upsert({
      where:  { orderId },
      create: {
        orderId,
        method:        'MONCASH',
        status:        'PENDING',
        amountHTG:     new Decimal(amountHTG),
        transactionId: internalRef,
        moncashOrderId: internalRef,
        gatewayData:   { paymentToken } as any,
      },
      update: {
        status:        'PENDING',
        transactionId: internalRef,
        moncashOrderId: internalRef,
        gatewayData:   { paymentToken } as any,
      },
    });

    return {
      redirect_url: redirectUrl,
      payment_id:   payment.id,
      order_id:     orderId,
      amount_htg:   amountHTG,
    };
  }

  // ── Vérifier un paiement MonCash après retour (par transactionId MonCash) ──
  async verifyByTransactionId(moncashTransactionId: string, userId: string) {
    // Anti-replay : déjà traité ?
    const existing = await this.prisma.payment.findUnique({
      where: { moncashTransactionId },
    });
    if (existing?.status === 'COMPLETED') {
      throw new ConflictException('Transaksyon deja kredite — double crédit bloqué');
    }

    // Appel MonCash pour confirmation
    const mc = await this.moncash.verifyByTransactionId(moncashTransactionId);

    if (mc.message !== 'successful') {
      // Enregistrer l'échec
      if (existing) {
        await this.prisma.payment.update({
          where: { id: existing.id },
          data:  {
            status:              'FAILED',
            moncashTransactionId,
            failureReason:       mc.message,
            gatewayData:         mc as any,
          },
        });
      }
      throw new BadRequestException(`Paiement échoué: ${mc.message}`);
    }

    // Le montant vient de MonCash, jamais du frontend
    const confirmedAmount = new Decimal(mc.cost);

    // Mettre à jour le paiement et confirmer la commande en transaction atomique
    const payment = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.payment.update({
        where: { id: existing!.id },
        data: {
          status:              'COMPLETED',
          amountHTG:           confirmedAmount,
          moncashTransactionId,
          paidAt:              new Date(),
          gatewayData:         mc as any,
        },
      });

      // Confirmer la commande
      if (existing?.orderId) {
        await tx.order.update({
          where: { id: existing.orderId },
          data:  { status: 'CONFIRMED' },
        });
      }

      return updated;
    });

    return {
      status:          'completed',
      amount_htg:      Number(confirmedAmount),
      transaction_id:  moncashTransactionId,
      payer:           mc.payer,
      payment_id:      payment.id,
      order_id:        existing?.orderId,
    };
  }

  // ── Vérifier par orderId interne (fallback depuis le dashboard) ───────────
  async verifyByOrderId(internalOrderId: string, userId: string) {
    const payment = await this.prisma.payment.findFirst({
      where: { moncashOrderId: internalOrderId },
      include: { order: { select: { userId: true } } },
    });
    if (!payment) throw new NotFoundException('Paiement introuvable');
    if (payment.order?.userId !== userId) throw new ForbiddenException();

    if (payment.status === 'COMPLETED') {
      throw new ConflictException('Paiement déjà confirmé');
    }

    const mc = await this.moncash.verifyByOrderId(internalOrderId);

    if (mc.message !== 'successful') {
      throw new BadRequestException(`Paiement échoué: ${mc.message}`);
    }

    return this.verifyByTransactionId(mc.transaction_id, userId);
  }

  // ── Historique des paiements d'un utilisateur ─────────────────────────────
  findMine(userId: string, page = 1) {
    return this.prisma.payment.findMany({
      where:   { order: { userId } },
      include: { order: { select: { id: true, status: true, totalHTG: true } } },
      skip:    (page - 1) * 20,
      take:    20,
      orderBy: { createdAt: 'desc' },
    });
  }
}
