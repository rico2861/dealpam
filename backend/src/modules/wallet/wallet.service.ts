import {
  Injectable, NotFoundException, BadRequestException, ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { MoncashService } from '../moncash/moncash.service';
import { randomUUID } from 'crypto';

@Injectable()
export class WalletService {
  constructor(
    private prisma: PrismaService,
    private moncash: MoncashService,
  ) {}

  private async ensureWallet(sellerId: string) {
    let w = await this.prisma.sellerWallet.findUnique({ where: { sellerId } });
    if (!w) w = await this.prisma.sellerWallet.create({ data: { sellerId, balance: 0 } });
    return w;
  }

  async getWallet(sellerId: string) {
    const w = await this.ensureWallet(sellerId);
    const transactions = await this.prisma.walletTransaction.findMany({
      where: { walletId: w.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    return { ...w, transactions };
  }

  /** Step 1 — crée un paiement MonCash et retourne l'URL de redirection */
  async initRecharge(sellerId: string, amount: number): Promise<{ redirectUrl: string; orderId: string }> {
    if (amount < 25) throw new BadRequestException('Montant minimum: 25 HTG');

    const orderId = `WALLET-${randomUUID()}`;
    const { redirectUrl } = await this.moncash.createPayment(amount, orderId);

    // Stocker la demande en attente (pour vérifier le montant au retour)
    await this.ensureWallet(sellerId);
    await this.prisma.walletTransaction.create({
      data: {
        walletId: (await this.prisma.sellerWallet.findUnique({ where: { sellerId } }))!.id,
        type: 'RECHARGE_PENDING',
        amount,
        balanceAfter: 0,
        description: `Recharge MonCash en attente`,
        reference: orderId,
        status: 'PENDING',
      },
    });

    return { redirectUrl, orderId };
  }

  /** Step 2 — appelé après retour MonCash, vérifie via API et crédite le wallet */
  async confirmRecharge(sellerId: string, transactionId: string) {
    // Anti-double-crédit
    const already = await this.prisma.walletTransaction.findFirst({
      where: { reference: transactionId, type: 'RECHARGE', status: 'COMPLETED' },
    });
    if (already) throw new ConflictException('Transaction déjà créditée');

    // Vérifier la transaction chez MonCash
    let payment: any;
    try {
      payment = await this.moncash.verifyByTransactionId(transactionId);
    } catch {
      throw new BadRequestException('Transaction introuvable ou invalide chez MonCash');
    }

    const amount = Number(payment.cost);
    if (!amount || amount < 25) throw new BadRequestException('Montant invalide');

    // Vérifier que l'orderId correspond à une recharge en attente pour CE vendeur
    const wallet = await this.ensureWallet(sellerId);
    const pending = await this.prisma.walletTransaction.findFirst({
      where: { walletId: wallet.id, reference: payment.reference, status: 'PENDING', type: 'RECHARGE_PENDING' },
    });
    if (!pending) throw new NotFoundException('Demande de recharge introuvable pour ce compte');

    // Marquer le pending comme consommé de façon atomique (empêche une double confirmation
    // concurrente de la même demande) — si 0 ligne affectée, une autre requête l'a déjà traité.
    const claimed = await this.prisma.walletTransaction.updateMany({
      where: { id: pending.id, status: 'PENDING' },
      data: { status: 'CANCELLED', description: 'Remplacée par confirmation' },
    });
    if (claimed.count === 0) throw new ConflictException('Transaction déjà en cours de traitement');

    // Créditer de façon atomique (increment Prisma, pas de lecture+écriture séparée)
    const updated = await this.prisma.sellerWallet.update({
      where: { id: wallet.id },
      data: { balance: { increment: amount } },
    });
    await this.prisma.walletTransaction.create({
      data: {
        walletId: wallet.id,
        type: 'RECHARGE',
        amount,
        balanceAfter: updated.balance,
        description: `Recharge MonCash confirmée`,
        reference: transactionId,
        status: 'COMPLETED',
      },
    });

    return { balance: updated.balance, amount, message: 'Recharge effectuée avec succès' };
  }

  async deductForCampaign(sellerId: string, campaignId: string, amount: number) {
    const wallet = await this.ensureWallet(sellerId);

    // Décrément atomique conditionné sur le solde actuel — empêche deux débits
    // concurrents de dépasser le solde disponible (race condition lost-update).
    const result = await this.prisma.sellerWallet.updateMany({
      where: { id: wallet.id, balance: { gte: amount } },
      data: { balance: { decrement: amount } },
    });
    if (result.count === 0) throw new BadRequestException('Solde insuffisant');

    const updated = await this.prisma.sellerWallet.findUniqueOrThrow({ where: { id: wallet.id } });
    await this.prisma.walletTransaction.create({
      data: {
        walletId: wallet.id,
        type: 'CAMPAIGN_PAYMENT',
        amount: -amount,
        balanceAfter: updated.balance,
        description: `Paiement campagne`,
        reference: campaignId,
        status: 'COMPLETED',
      },
    });
    return { balance: updated.balance };
  }
}
