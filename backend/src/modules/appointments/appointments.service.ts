import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { NotificationsService } from '../notifications/notifications.service';

const STATUS_LABEL: Record<string, string> = {
  CONFIRMED: 'confirmé',
  REFUSED:   'refusé',
  DONE:      'marqué comme terminé',
  CANCELLED: 'annulé',
};

@Injectable()
export class AppointmentsService {
  constructor(private prisma: PrismaService, private mail: MailService, private notifications: NotificationsService) {}

  // ── Client: book with account ──────────────────────────────────────────────

  async create(userId: string, dto: {
    productId: string; scheduledAt: string; note?: string;
    serviceType?: string; duration?: number;
  }) {
    const product = await this.prisma.product.findUnique({
      where: { id: dto.productId },
      include: { store: { include: { seller: { include: { user: true } } } } },
    });
    if (!product) throw new NotFoundException('Service introuvable');
    if (!product.requiresAppointment && product.productType === 'PHYSICAL')
      throw new BadRequestException('Ce produit n\'accepte pas de rendez-vous');

    const appt = await (this.prisma.appointment as any).create({
      data: {
        userId,
        productId: dto.productId,
        storeId: product.storeId,
        scheduledAt: new Date(dto.scheduledAt),
        note: dto.note,
        serviceType: dto.serviceType,
        duration: dto.duration,
      },
      include: { product: true, store: true },
    });

    await this.notifySeller(product, dto.scheduledAt, null);
    return appt;
  }

  // ── Public: book without account ───────────────────────────────────────────

  async createPublic(dto: {
    productId: string; scheduledAt: string; note?: string;
    clientName: string; clientPhone: string; clientEmail?: string;
    serviceType?: string; duration?: number;
  }) {
    const product = await this.prisma.product.findUnique({
      where: { id: dto.productId },
      include: { store: { include: { seller: { include: { user: true } } } } },
    });
    if (!product) throw new NotFoundException('Service introuvable');
    if (!['SERVICE', 'FREELANCE'].includes(product.productType) && !product.requiresAppointment)
      throw new BadRequestException('Ce service n\'accepte pas de rendez-vous en ligne');

    const appt = await (this.prisma.appointment as any).create({
      data: {
        userId: null,  // guest booking
        productId: dto.productId,
        storeId: product.storeId,
        scheduledAt: new Date(dto.scheduledAt),
        note: dto.note,
        clientName: dto.clientName,
        clientPhone: dto.clientPhone,
        clientEmail: dto.clientEmail ?? null,
        serviceType: dto.serviceType,
        duration: dto.duration,
      },
    });

    await this.notifySeller(product, dto.scheduledAt, dto.clientName);
    return appt;
  }

  // ── Client: get own appointments ───────────────────────────────────────────

  async findForUser(userId: string) {
    return (this.prisma.appointment as any).findMany({
      where: { userId },
      include: { product: { include: { images: { where: { isPrimary: true }, take: 1 } } }, store: true },
      orderBy: { scheduledAt: 'asc' },
    });
  }

  // ── Seller: get all appointments across all their stores ───────────────────

  async findForSeller(userId: string) {
    const seller = await this.prisma.seller.findUnique({ where: { userId }, select: { id: true } });
    if (!seller) return [];
    const stores = await this.prisma.store.findMany({ where: { sellerId: seller.id }, select: { id: true } });
    const storeIds = stores.map(s => s.id);
    return (this.prisma.appointment as any).findMany({
      where: { storeId: { in: storeIds } },
      include: { product: { select: { id: true, name: true, productType: true } }, store: { select: { id: true, name: true } } },
      orderBy: { scheduledAt: 'desc' },
    });
  }

  // ── Seller: update status ─────────────────────────────────────────────────

  async updateStatus(userId: string, id: string, status: string, sellerNote?: string) {
    const seller = await this.prisma.seller.findUnique({ where: { userId }, select: { id: true } });
    if (!seller) throw new ForbiddenException('Rendez-vous introuvable');
    const stores = await this.prisma.store.findMany({ where: { sellerId: seller.id }, select: { id: true } });
    const storeIds = stores.map(s => s.id);
    // updateMany re-filtre par storeId pour éviter toute fenêtre TOCTOU entre la vérification
    // d'appartenance et l'écriture (au lieu d'un findFirst suivi d'un update({ where: { id } })).
    const result = await (this.prisma.appointment as any).updateMany({
      where: { id, storeId: { in: storeIds } },
      data: { status, sellerNote },
    });
    if (result.count === 0) throw new ForbiddenException('Rendez-vous introuvable');
    const appt = await (this.prisma.appointment as any).findUnique({
      where: { id },
      include: { product: true, store: true },
    });
    if (['CONFIRMED', 'REFUSED', 'DONE'].includes(status)) {
      await this.notifyClient(appt, status);
    }
    return appt;
  }

  // ── Notify the client (registered user or guest) of a status change ───────

  private async notifyClient(appt: any, status: string) {
    const label = STATUS_LABEL[status] ?? status;
    const when = new Date(appt.scheduledAt).toLocaleString('fr-FR');
    const subject = `Votre rendez-vous a été ${label} — Dealpam`;
    const body = `Votre rendez-vous pour <strong>${appt.product?.name}</strong> le <strong>${when}</strong> a été <strong>${label}</strong> par ${appt.store?.name}.` +
      (appt.sellerNote ? `<br/><br/>Note du vendeur : ${appt.sellerNote}` : '');

    const user = appt.userId ? await this.prisma.user.findUnique({ where: { id: appt.userId }, select: { email: true } }) : null;
    const email = user?.email ?? appt.clientEmail;
    if (email) this.mail.sendRaw(email, subject, body, 'client').catch(() => null);

    if (appt.userId) {
      await this.notifications.create(appt.userId, subject, `Rendez-vous ${label} pour ${appt.product?.name} le ${when}.`, 'APPOINTMENT_STATUS', { appointmentId: appt.id, status });
    }
  }

  // ── Client: cancel own appointment ────────────────────────────────────────

  async cancel(userId: string, id: string) {
    const appt = await (this.prisma.appointment as any).findFirst({ where: { id, userId } });
    if (!appt) throw new ForbiddenException('Rendez-vous introuvable');
    return (this.prisma.appointment as any).update({ where: { id }, data: { status: 'CANCELLED' } });
  }

  // ── Admin: all appointments ───────────────────────────────────────────────

  async findAll() {
    return (this.prisma.appointment as any).findMany({
      include: { product: { select: { id: true, name: true } }, store: { select: { id: true, name: true } } },
      orderBy: { scheduledAt: 'desc' },
      take: 200,
    });
  }

  // ── Helper ─────────────────────────────────────────────────────────────────

  private async notifySeller(product: any, scheduledAt: string, clientName: string | null) {
    const sellerUser = product.store?.seller?.user;
    if (!sellerUser) return;
    const who = clientName ? `<strong>${clientName}</strong>` : 'Un client';
    this.mail.sendRaw(
      sellerUser.email,
      'Nouvelle demande de rendez-vous — Dealpam',
      `${who} a demandé un rendez-vous pour <strong>${product.name}</strong> le <strong>${new Date(scheduledAt).toLocaleString('fr-FR')}</strong>.<br/>Connectez-vous à votre dashboard pour confirmer ou refuser.`,
      'seller',
    ).catch(() => null);
  }
}
