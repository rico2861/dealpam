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
            '⛔ Votre boutique Dealpam a été désactivée',
            `
            <p>Bonjour <strong>${user.firstName}</strong>,</p>
            <p>Votre abonnement <strong>${sub.plan.name}</strong>${sub.isTrial ? ' (essai gratuit)' : ''} a expiré le <strong>${sub.endDate.toLocaleDateString('fr-FR')}</strong>.</p>
            <p>Conséquences immédiates :</p>
            <ul>
              <li>❌ Vous ne pouvez plus publier de nouveaux produits ou services</li>
              <li>❌ Tous vos produits/services déjà publiés ne sont plus visibles par les clients sur la plateforme</li>
            </ul>
            <p>✅ <strong>Bonne nouvelle :</strong> rien n'est supprimé. Vos produits restent enregistrés et repasseront automatiquement en ligne, tels quels, dès que vous payez un plan — aucune republication nécessaire.</p>
            <p><a href="${process.env.FRONTEND_URL}/seller/subscription" style="background:#2563EB;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;">Choisir un plan et réactiver ma boutique</a></p>
            `,
            'seller',
          ).catch(() => null);
          await this.notifications.create(
            user.id,
            'Boutique désactivée',
            `Votre ${sub.isTrial ? "essai gratuit" : "abonnement " + sub.plan.name} a expiré. Vos produits ne sont plus visibles. Payez un plan pour tout réactiver.`,
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
            ? `⏰ Votre essai gratuit se termine dans ${daysLeft} jour(s)`
            : `⏰ Votre abonnement expire dans ${daysLeft} jour(s)`,
          `
          <p>Bonjour <strong>${user.firstName}</strong>,</p>
          <p>${sub.isTrial ? 'Votre période d\'essai gratuit de 30 jours' : `Votre abonnement <strong>${sub.plan.name}</strong>`} se termine dans <strong>${daysLeft} jour(s)</strong>.</p>
          <p>⚠️ Si vous ne choisissez pas de plan avant cette date :</p>
          <ul>
            <li>Vous ne pourrez plus publier de nouveaux produits ou services</li>
            <li>Tous vos produits/services actuellement publiés deviendront invisibles pour les clients</li>
          </ul>
          <p>Vos données restent enregistrées — dès qu'un plan est payé, tout redevient visible automatiquement.</p>
          <p><a href="${process.env.FRONTEND_URL}/seller/subscription" style="background:#2563EB;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;">Choisir un plan maintenant</a></p>
          `,
          'seller',
        ).catch(() => null);
        await this.notifications.create(
          user.id,
          sub.isTrial ? `Essai gratuit : ${daysLeft}j restants` : `Abonnement : ${daysLeft}j restants`,
          `${sub.isTrial ? "Votre essai gratuit" : `Votre abonnement ${sub.plan.name}`} se termine dans ${daysLeft} jour(s). Pensez à choisir un plan pour ne pas perdre la visibilité de vos produits.`,
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
