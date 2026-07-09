import {
  Injectable, NotFoundException, BadRequestException, ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { MoncashService } from '../moncash/moncash.service';
import { MoncashTransactionsService } from '../moncash-transactions/moncash-transactions.service';
import { randomUUID } from 'crypto';

@Injectable()
export class WalletService {
  constructor(
    private prisma: PrismaService,
    private moncash: MoncashService,
    private moncashTx: MoncashTransactionsService,
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

  /**
   * Step 2 — appelé après retour MonCash, vérifie via API et crédite le wallet.
   * Volontairement indépendant du JWT de l'appelant (voir wallet.controller.ts) :
   * MonCash déconnecte parfois le navigateur au retour, donc le compte à créditer
   * est retrouvé via la recharge PENDING correspondant à payment.reference — un
   * identifiant retourné par MonCash lui-même, jamais fourni par le client —
   * et non via un sellerId qui viendrait d'une session potentiellement expirée.
   */
  async confirmRecharge(transactionId: string) {
    // Anti-double-crédit
    const already = await this.prisma.walletTransaction.findFirst({
      where: { reference: transactionId, type: 'RECHARGE', status: 'COMPLETED' },
    });
    if (already) throw new ConflictException('Transaction déjà créditée');

    // Vérifier la transaction chez MonCash
    let payment: any;
    try {
      payment = await this.moncash.verifyByTransactionId(transactionId);
    } catch (err: any) {
      await this.moncashTx.record({ scenario: 'wallet', status: 'FAILED', mc: null, failReason: err?.message ?? 'not_found' });
      throw new BadRequestException('Transaction introuvable ou invalide chez MonCash');
    }

    if (payment.message !== 'successful') {
      await this.moncashTx.record({ scenario: 'wallet', status: 'FAILED', mc: payment, failReason: payment.message });
      throw new BadRequestException(`Pèman echwe: ${payment.message}`);
    }

    const amount = Number(payment.cost);
    if (!amount || amount < 25) throw new BadRequestException('Montant invalide');

    // Verrou centralisé anti-double-crédit (indépendant de la table wallet_transactions)
    const alreadyCredited = await this.moncashTx.isAlreadyCredited(payment.transaction_id);
    if (alreadyCredited) throw new ConflictException('Transaction déjà créditée');

    // Retrouver la recharge PENDING correspondante — reference vient de MonCash,
    // pas besoin (et pas de moyen fiable) de la scoper par sellerId ici.
    const pending = await this.prisma.walletTransaction.findFirst({
      where: { reference: payment.reference, status: 'PENDING', type: 'RECHARGE_PENDING' },
    });
    if (!pending) {
      await this.moncashTx.record({ scenario: 'wallet', status: 'FAILED', mc: payment, failReason: `pending_not_found:${payment.reference}` });
      throw new NotFoundException('Demande de recharge introuvable pour ce compte');
    }

    await this.moncashTx.record({ scenario: 'wallet', status: 'SUCCESS', mc: payment, orderId: payment.reference });
    const claimed = await this.moncashTx.claimCredit(payment.transaction_id);
    if (!claimed) throw new ConflictException('Transaction déjà créditée');

    // Marquer le pending comme consommé de façon atomique (empêche une double confirmation
    // concurrente de la même demande) — si 0 ligne affectée, une autre requête l'a déjà traité.
    const claimedPending = await this.prisma.walletTransaction.updateMany({
      where: { id: pending.id, status: 'PENDING' },
      data: { status: 'CANCELLED', description: 'Remplacée par confirmation' },
    });
    if (claimedPending.count === 0) throw new ConflictException('Transaction déjà en cours de traitement');

    // Créditer de façon atomique (increment Prisma, pas de lecture+écriture séparée)
    const updated = await this.prisma.sellerWallet.update({
      where: { id: pending.walletId },
      data: { balance: { increment: amount } },
    });
    await this.prisma.walletTransaction.create({
      data: {
        walletId: pending.walletId,
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

  /** Débit quotidien partiel d'une campagne (facturation au jour le jour par le cron ads) —
   * même schéma transactionnel/ledger que deductForCampaign, paramétré sur un montant
   * arbitraire au lieu du budget total de la campagne. */
  async deductDailyForCampaign(sellerId: string, campaignId: string, amount: number) {
    const wallet = await this.ensureWallet(sellerId);

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
        description: `Facturation quotidienne campagne`,
        reference: campaignId,
        status: 'COMPLETED',
      },
    });
    return { balance: updated.balance };
  }

  /** Solde actuel du wallet (créé si inexistant) — utilisé par le cron pour vérifier
   * les fonds disponibles avant de facturer une campagne. */
  async getBalance(sellerId: string): Promise<number> {
    const w = await this.ensureWallet(sellerId);
    return Number(w.balance);
  }
}
