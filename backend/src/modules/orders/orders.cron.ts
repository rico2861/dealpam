import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { NotificationsService } from '../notifications/notifications.service';
import { OrdersService } from './orders.service';

@Injectable()
export class OrdersCron {
  private readonly logger = new Logger(OrdersCron.name);

  // Garde-fou anti-doublon (granularité heure, ce cron tourne toutes les heures) :
  // empêche un second déclenchement dans la même heure calendaire.
  private lastRunKey: string | null = null;

  constructor(
    private prisma: PrismaService,
    private mail: MailService,
    private notifications: NotificationsService,
    private ordersService: OrdersService,
  ) {}

  @Cron(CronExpression.EVERY_HOUR)
  async handleStaleOrders() {
    const runKey = new Date().toISOString().slice(0, 13);
    if (this.lastRunKey === runKey) {
      this.logger.warn(`Orders cron already ran this hour (${runKey}) — skipping duplicate run.`);
      return;
    }
    this.lastRunKey = runKey;

    this.logger.log('Running stale PENDING orders check…');

    const now = new Date();
    const h48 = new Date(now.getTime() - 48 * 3_600_000);
    const h96 = new Date(now.getTime() - 96 * 3_600_000);

    // ── Étape 1 : rappel au vendeur (48h sans réponse, pas encore rappelé) ────
    const toRemind = await this.prisma.order.findMany({
      where: { status: 'PENDING', createdAt: { lte: h48 }, reminderSentAt: null },
      include: { store: { select: { id: true, name: true, seller: { select: { userId: true } } } } },
    });

    for (const order of toRemind) {
      try {
        const sellerUserId = order.store?.seller?.userId;
        if (sellerUserId) {
          await this.notifications.create(
            sellerUserId,
            'Commande en attente',
            `Une commande #${order.id.slice(-8).toUpperCase()} attend votre confirmation depuis 48h.`,
            'ORDER_REMINDER',
            { orderId: order.id },
          ).catch(() => {});
        }
        await this.prisma.order.update({ where: { id: order.id }, data: { reminderSentAt: new Date() } });
      } catch (err: any) {
        this.logger.error(`Failed to send reminder for order ${order.id}: ${err?.message}`);
      }
    }

    // ── Étape 2 : auto-annulation (96h / 4 jours sans réponse) ────────────────
    const toCancel = await this.prisma.order.findMany({
      where: { status: 'PENDING', createdAt: { lte: h96 } },
      include: {
        user: { select: { id: true, email: true, firstName: true } },
        store: { select: { id: true, name: true, seller: { select: { userId: true } } } },
      },
    });

    for (const order of toCancel) {
      try {
        const reason = "Annulée automatiquement — le vendeur n'a pas répondu sous 4 jours.";
        await this.prisma.order.update({
          where: { id: order.id },
          data: { status: 'CANCELLED', cancelReason: reason },
        });

        if (order.storeId) {
          await this.ordersService.applyAutoCancelPenalty(order.storeId).catch(() => {});
        }

        if (order.user?.email) {
          await this.mail.sendOrderStatusUpdate(
            order.user.email,
            order.user.firstName,
            order.id.slice(-8).toUpperCase(),
            'CANCELLED',
            "Cette commande a été annulée automatiquement car le vendeur n'a pas répondu dans les délais. Vous ne serez pas facturé.",
          ).catch(() => {});
          await this.notifications.create(
            order.user.id,
            'Commande annulée automatiquement',
            `Votre commande #${order.id.slice(-8).toUpperCase()} a été annulée automatiquement car le vendeur n'a pas répondu à temps.`,
            'ORDER_AUTO_CANCELLED',
            { orderId: order.id },
          ).catch(() => {});
        }

        const sellerUserId = order.store?.seller?.userId;
        if (sellerUserId) {
          await this.notifications.create(
            sellerUserId,
            'Commande annulée automatiquement',
            `Vous n'avez pas traité la commande #${order.id.slice(-8).toUpperCase()} à temps — elle a été annulée et votre score de réputation a été impacté.`,
            'ORDER_AUTO_CANCELLED',
            { orderId: order.id },
          ).catch(() => {});
        }
      } catch (err: any) {
        this.logger.error(`Failed to auto-cancel order ${order.id}: ${err?.message}`);
      }
    }

    this.logger.log(`Done: ${toRemind.length} reminded, ${toCancel.length} auto-cancelled`);
  }
}
