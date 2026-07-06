import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class SubscriptionCron {
  private readonly logger = new Logger(SubscriptionCron.name);

  private lastRunDate: string | null = null;

  constructor(
    private prisma: PrismaService,
    private mail: MailService,
    private notifications: NotificationsService,
  ) {}

  // Run every night at 2:00 AM
  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async handleExpiredSubscriptions() {
    // Garde-fou anti-doublon : empêche un second déclenchement (redémarrage, appel manuel)
    // le même jour calendaire de renvoyer les mêmes emails d'expiration/rappel.
    const today = new Date().toISOString().slice(0, 10);
    if (this.lastRunDate === today) {
      this.logger.warn(`Subscription cron already ran today (${today}) — skipping duplicate run.`);
      return;
    }
    this.lastRunDate = today;

    this.logger.log('Running subscription expiry check…');

    const now = new Date();

    // Find subscriptions that just expired (still marked active)
    const expired = await this.prisma.sellerSubscription.findMany({
      where: { isActive: true, endDate: { lt: now } },
      include: {
        seller: {
          include: {
            stores: { take: 1, where: { isPrimary: true } },
            user: true,
          },
        },
        plan: true,
      },
    });

    for (const sub of expired) {
      try {
        // Mark subscription as inactive
        await this.prisma.sellerSubscription.update({
          where: { id: sub.id },
          data: { isActive: false },
        });

        // Suspend all published products of this store
        const primaryStore = (sub.seller as any).stores?.[0];
        if (primaryStore) {
          await this.prisma.product.updateMany({
            where: { storeId: primaryStore.id, status: 'PUBLISHED' },
            data: { status: 'SUSPENDED' },
          });

          // Deactivate store
          await this.prisma.store.update({
            where: { id: primaryStore.id },
            data: { isActive: false },
          });
        }

        // Send expiry email to seller
        const user = sub.seller.user;
        if (user?.email) {
          await this.mail.sendRaw(
            user.email,
            'Votre abonnement DealPam a expiré',
            `
            <p>Bonjour <strong>${user.firstName}</strong>,</p>
            <p>Votre ${sub.isTrial ? "période d'essai" : `abonnement <strong>${sub.plan.name}</strong>`} a pris fin le <strong>${sub.endDate.toLocaleDateString('fr-FR')}</strong>.</p>
            <p>Conséquences sur votre compte :</p>
            <ul>
              <li>Vous ne pouvez plus publier de nouveaux produits ou services</li>
              <li>Vos produits et services publiés ne sont plus visibles sur la plateforme</li>
            </ul>
            <p>Aucune donnée n'est supprimée. Vos produits restent enregistrés et seront republiés automatiquement, tels quels, dès l'activation d'un plan — aucune republication manuelle n'est nécessaire.</p>
            <p><a href="${process.env.FRONTEND_URL}/seller/subscription" style="background:#2563EB;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;">Sélectionner un plan</a></p>
            `,
            'seller',
          ).catch(() => null);
          await this.notifications.create(
            user.id,
            'Abonnement expiré',
            `Votre ${sub.isTrial ? "période d'essai" : "abonnement " + sub.plan.name} a expiré. Vos produits ne sont plus visibles sur la plateforme. Sélectionnez un plan pour les réactiver.`,
            'SUBSCRIPTION_EXPIRED',
          ).catch(() => null);
        }

        this.logger.log(`Suspended seller ${sub.seller.id} (expired: ${sub.endDate.toISOString()})`);
      } catch (err) {
        this.logger.error(`Failed to process expired sub ${sub.id}: ${err.message}`);
      }
    }

    // Find subscriptions expiring in 3 days — send warning
    const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
    const expiringSoon = await this.prisma.sellerSubscription.findMany({
      where: {
        isActive: true,
        endDate: { gte: now, lte: threeDaysFromNow },
      },
      include: { seller: { include: { user: true } }, plan: true },
    });

    for (const sub of expiringSoon) {
      const user = sub.seller.user;
      const daysLeft = Math.ceil((sub.endDate.getTime() - now.getTime()) / 86400000);
      if (user?.email) {
        await this.mail.sendRaw(
          user.email,
          sub.isTrial
            ? `Votre période d'essai se termine dans ${daysLeft} jour(s)`
            : `Votre abonnement expire dans ${daysLeft} jour(s)`,
          `
          <p>Bonjour <strong>${user.firstName}</strong>,</p>
          <p>${sub.isTrial ? "Votre période d'essai de 30 jours sur le plan Business" : `Votre abonnement <strong>${sub.plan.name}</strong>`} se termine dans <strong>${daysLeft} jour(s)</strong>.</p>
          <p>Sans sélection de plan avant cette date :</p>
          <ul>
            <li>Vous ne pourrez plus publier de nouveaux produits ou services</li>
            <li>Vos produits et services publiés deviendront invisibles pour les clients</li>
          </ul>
          <p>Vos données restent enregistrées. Dès l'activation d'un plan, tout redevient visible automatiquement.</p>
          <p><a href="${process.env.FRONTEND_URL}/seller/subscription" style="background:#2563EB;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;">Sélectionner un plan</a></p>
          `,
          'seller',
        ).catch(() => null);
        await this.notifications.create(
          user.id,
          sub.isTrial ? `Période d'essai : ${daysLeft} jour(s) restant(s)` : `Abonnement : ${daysLeft} jour(s) restant(s)`,
          `${sub.isTrial ? "Votre période d'essai" : `Votre abonnement ${sub.plan.name}`} se termine dans ${daysLeft} jour(s). Sélectionnez un plan pour conserver la visibilité de vos produits.`,
          'SUBSCRIPTION_EXPIRING',
        ).catch(() => null);
      }
    }

    this.logger.log(`Done: ${expired.length} expired, ${expiringSoon.length} warned`);
  }

  // When a new subscription is created/renewed — reactivate products
  async reactivateSeller(sellerId: string) {
    const store = await this.prisma.store.findFirst({ where: { sellerId, isPrimary: true } });
    if (!store) return;

    await this.prisma.store.update({ where: { id: store.id }, data: { isActive: true } });
    await this.prisma.product.updateMany({
      where: { storeId: store.id, status: 'SUSPENDED' },
      data: { status: 'PUBLISHED' },
    });
    this.logger.log(`Reactivated seller ${sellerId}`);
  }
}
