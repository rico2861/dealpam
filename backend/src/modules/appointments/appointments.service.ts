import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { MailService } from '../mail/mail.service';

@Injectable()
export class AppointmentsService {
  constructor(private prisma: PrismaService, private mail: MailService) {}

  async create(userId: string, dto: { productId: string; scheduledAt: string; note?: string }) {
    const product = await this.prisma.product.findUnique({
      where: { id: dto.productId },
      include: { store: { include: { seller: { include: { user: true } } } } },
    });
    if (!product) throw new NotFoundException('Produit introuvable');
    if (!product.requiresAppointment) throw new BadRequestException('Ce produit n\'accepte pas de rendez-vous');

    const appt = await this.prisma.appointment.create({
      data: {
        userId,
        productId: dto.productId,
        storeId: product.storeId,
        scheduledAt: new Date(dto.scheduledAt),
        note: dto.note,
      },
      include: { product: true, store: true },
    });

    // Notify seller by email
    const sellerUser = product.store?.seller?.user;
    if (sellerUser) {
      this.mail.sendRaw(
        sellerUser.email,
        'Nouvelle demande de rendez-vous — Dealpam',
        `Un client a demandé un rendez-vous pour <strong>${product.name}</strong> le <strong>${new Date(dto.scheduledAt).toLocaleString('fr-FR')}</strong>.<br/>Connectez-vous à votre dashboard pour confirmer ou refuser.`,
      ).catch(() => null);
    }

    return appt;
  }

  async findForUser(userId: string) {
    return this.prisma.appointment.findMany({
      where: { userId },
      include: { product: { include: { images: { where: { isPrimary: true }, take: 1 } } }, store: true },
      orderBy: { scheduledAt: 'asc' },
    });
  }

  async findForSeller(sellerId: string) {
    const store = await this.prisma.store.findUnique({ where: { sellerId } });
    if (!store) throw new NotFoundException('Boutique introuvable');
    return this.prisma.appointment.findMany({
      where: { storeId: store.id },
      include: { product: true, store: false },
      orderBy: { scheduledAt: 'asc' },
    });
  }

  async updateStatus(sellerId: string, id: string, status: string, sellerNote?: string) {
    const store = await this.prisma.store.findUnique({ where: { sellerId } });
    const appt = await this.prisma.appointment.findFirst({ where: { id, storeId: store?.id } });
    if (!appt) throw new ForbiddenException('Rendez-vous introuvable');
    return this.prisma.appointment.update({ where: { id }, data: { status: status as any, sellerNote } });
  }

  async cancel(userId: string, id: string) {
    const appt = await this.prisma.appointment.findFirst({ where: { id, userId } });
    if (!appt) throw new ForbiddenException('Rendez-vous introuvable');
    return this.prisma.appointment.update({ where: { id }, data: { status: 'CANCELLED' } });
  }
}
