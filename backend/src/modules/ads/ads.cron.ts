import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import { WalletService } from '../wallet/wallet.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class AdsCron {
  private readonly logger = new Logger(AdsCron.name);

  // Garde-fou anti-doublon — clé sur l'heure calendaire pour éviter un second
  // déclenchement (redémarrage, appel manuel) de facturer deux fois la même heure.
  private lastRunHour: string | null = null;

  constructor(
    private prisma: PrismaService,
    private walletService: WalletService,
    private notifications: NotificationsService,
  ) {}

  @Cron(CronExpression.EVERY_HOUR)
  async handleDailyBilling() {
    const now = new Date();
    const hourKey = now.toISOString().slice(0, 13); // YYYY-MM-DDTHH
    if (this.lastRunHour === hourKey) {
      this.logger.warn(`Ads billing cron already ran this hour (${hourKey}) — skipping duplicate run.`);
      return;
    }
    this.lastRunHour = hourKey;

    this.logger.log('Running ads daily billing check…');
    const today = now.toISOString().slice(0, 10);

    const campaigns = await this.prisma.adCampaign.findMany({
      where: {
        status: 'ACTIVE',
        publishedAt: { not: null, lte: now },
        endDate: { gte: now },
      },
      include: {
        seller: true,
        product: true,
        store: true,
      },
    });

    let billed = 0;
    let paused = 0;

    for (const campaign of campaigns) {
      try {
        // lastBilledDate déjà à aujourd'hui — pas de rebillement (comparaison par date seule)
        if (campaign.lastBilledDate && campaign.lastBilledDate.toISOString().slice(0, 10) === today) {
          continue;
        }

        const totalBudget = Number(campaign.totalBudget);
        const spent = Number(campaign.spent);
        const days = Math.max(1, Math.ceil((campaign.endDate.getTime() - campaign.startDate.getTime()) / 86_400_000));
        const dailyRate = campaign.dailyBudget ? Number(campaign.dailyBudget) : totalBudget / days;
        const remaining = totalBudget - spent;
        const charge = Math.min(dailyRate, Math.max(0, remaining));

        if (charge <= 0) {
          // Budget déjà épuisé — bascule en COMPLETED, pas de facturation.
          await this.prisma.adCampaign.update({ where: { id: campaign.id }, data: { status: 'COMPLETED' } });
          continue;
        }

        const sellerUserId = campaign.seller.userId;
        const balance = await this.walletService.getBalance(campaign.sellerId);

        if (balance < charge) {
          // Solde insuffisant — pause, pas de facturation, pas de lastBilledDate
          // (ré-essaie chaque heure tant que le vendeur n'a pas rechargé).
          await this.prisma.adCampaign.update({ where: { id: campaign.id }, data: { status: 'PAUSED' } });
          await this.notifications.create(
            sellerUserId,
            'Campagne mise en pause — solde insuffisant',
            `Votre campagne "${campaign.name}" a été mise en pause car votre solde Wallet (${balance} HTG) est insuffisant pour couvrir la facturation quotidienne (${charge.toFixed(2)} HTG). Rechargez votre wallet pour la relancer.`,
            'CAMPAIGN_PAUSED_LOW_BALANCE',
          ).catch(() => null);
          paused++;
          continue;
        }

        await this.walletService.deductDailyForCampaign(campaign.sellerId, campaign.id, charge);

        const newSpent = spent + charge;
        const data: any = { spent: { increment: charge }, lastBilledDate: now };
        if (newSpent >= totalBudget) data.status = 'COMPLETED';
        await this.prisma.adCampaign.update({ where: { id: campaign.id }, data });

        // Rafraîchit le boost — couvre la durée restante de la campagne, s'auto-expire
        // naturellement à endDate sans intervention supplémentaire du cron.
        if (campaign.productId) {
          await this.prisma.product.update({ where: { id: campaign.productId }, data: { adBoostedUntil: campaign.endDate } });
        }
        if (campaign.storeId) {
          await this.prisma.store.update({ where: { id: campaign.storeId }, data: { adBoostedUntil: campaign.endDate } });
        }

        billed++;
      } catch (err: any) {
        this.logger.error(`Failed to bill campaign ${campaign.id}: ${err.message}`);
      }
    }

    // Hygiène de statut : campagnes ACTIVE dont l'échéance est passée sans avoir
    // atteint le plafond de budget (le boost s'auto-expire déjà via la date, ceci
    // n'est que pour la propreté du tableau de bord vendeur).
    const expired = await this.prisma.adCampaign.updateMany({
      where: { status: 'ACTIVE', endDate: { lt: now } },
      data: { status: 'COMPLETED' },
    });

    this.logger.log(`Ads billing done: ${billed} billed, ${paused} paused, ${expired.count} marked completed (expired).`);
  }
}
