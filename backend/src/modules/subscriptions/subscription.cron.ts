import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import { MailService } from '../mail/mail.service';

@Injectable()
export class SubscriptionCron {
  private readonly logger = new Logger(SubscriptionCron.name);

  constructor(private prisma: PrismaService, private mail: MailService) {}

  // Run every night at 2:00 AM
  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async handleExpiredSubscriptions() {
    this.logger.log('Running subscription expiry check…');

    const now = new Date();

    // Find subscriptions that just expired (still marked active)
    const expired = await this.prisma.sellerSubscription.findMany({
      where: { isActive: true, endDate: { lt: now } },
      include: {
        seller: {
          include: {
            store: true,
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
        if (sub.seller.store) {
          await this.prisma.product.updateMany({
            where: { storeId: sub.seller.store.id, status: 'PUBLISHED' },
            data: { status: 'SUSPENDED' },
          });

          // Deactivate store
          await this.prisma.store.update({
            where: { id: sub.seller.store.id },
            data: { isActive: false },
          });
        }

        // Send expiry email to seller
        const user = sub.seller.user;
        if (user?.email) {
          await this.mail.sendRaw(
            user.email,
            '⚠️ Votre abonnement Dealpam a expiré',
            `
            <p>Bonjour <strong>${user.firstName}</strong>,</p>
            <p>Votre abonnement <strong>${sub.plan.name}</strong> a expiré le <strong>${sub.endDate.toLocaleDateString('fr-FR')}</strong>.</p>
            <p>Conséquences :</p>
            <ul>
              <li>❌ Vos produits ont été désactivés</li>
              <li>❌ Votre boutique est temporairement inactive</li>
            </ul>
            <p>Renouvelez votre abonnement pour réactiver votre boutique immédiatement.</p>
            <p><a href="${process.env.FRONTEND_URL}/seller/subscription" style="background:#2563EB;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;">Renouveler mon abonnement</a></p>
            `,
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
          `⏰ Votre abonnement expire dans ${daysLeft} jour(s)`,
          `
          <p>Bonjour <strong>${user.firstName}</strong>,</p>
          <p>Votre abonnement <strong>${sub.plan.name}</strong> expire dans <strong>${daysLeft} jour(s)</strong>.</p>
          <p>Renouvelez maintenant pour éviter la suspension de votre boutique.</p>
          <p><a href="${process.env.FRONTEND_URL}/seller/subscription" style="background:#2563EB;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;">Renouveler</a></p>
          `,
        ).catch(() => null);
      }
    }

    this.logger.log(`Done: ${expired.length} expired, ${expiringSoon.length} warned`);
  }

  // When a new subscription is created/renewed — reactivate products
  async reactivateSeller(sellerId: string) {
    const store = await this.prisma.store.findUnique({ where: { sellerId } });
    if (!store) return;

    await this.prisma.store.update({ where: { id: store.id }, data: { isActive: true } });
    await this.prisma.product.updateMany({
      where: { storeId: store.id, status: 'SUSPENDED' },
      data: { status: 'PUBLISHED' },
    });
    this.logger.log(`Reactivated seller ${sellerId}`);
  }
}
