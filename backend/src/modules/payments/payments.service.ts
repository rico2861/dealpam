import { Injectable } from '@nestjs/common';
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

  async initiate(orderId: string, method: string, amountHTG: number) {
    return this.prisma.payment.create({
      data: { orderId, method: method as any, amountHTG, status: 'PENDING' }
    });
  }

  async confirm(transactionId: string, gatewayData?: any) {
    return this.prisma.payment.updateMany({
      where: { transactionId },
      data: { status: 'COMPLETED', paidAt: new Date(), gatewayData }
    });
  }
}
