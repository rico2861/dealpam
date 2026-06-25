import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class PaymentsService {
  constructor(private prisma: PrismaService) {}

  findAll(page = 1) {
    return this.prisma.payment.findMany({
      include: { order: { include: { user: { select: { firstName: true, lastName: true } } } } },
      skip: (page-1)*20, take: 20, orderBy: { createdAt: 'desc' }
    });
  }

  async initiate(orderId: string, userId: string, method: string) {
    const order = await this.prisma.order.findFirst({ where: { id: orderId, userId } });
    if (!order) throw new NotFoundException('Commande introuvable');
    if (order.status !== 'PENDING') throw new ForbiddenException('Commande déjà traitée');
    return this.prisma.payment.create({
      data: { orderId, method: method as any, amountHTG: order.totalHTG, status: 'PENDING' }
    });
  }

  async confirm(transactionId: string, gatewayData?: any) {
    return this.prisma.payment.updateMany({
      where: { transactionId },
      data: { status: 'COMPLETED', paidAt: new Date(), gatewayData }
    });
  }
}
