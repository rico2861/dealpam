import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class SellersService {
  constructor(private prisma: PrismaService) {}

  findAll(status?: string, page = 1, limit = 20) {
    const where = status ? { status: status as any } : {};
    return this.prisma.seller.findMany({
      where, skip: (page-1)*limit, take: limit,
      include: { user: { select: { firstName: true, lastName: true, email: true, phone: true } }, store: true, subscriptions: { where: { isActive: true }, include: { plan: true }, take: 1 } },
      orderBy: { createdAt: 'desc' }
    });
  }

  async approve(id: string, adminId: string) {
    const s = await this.prisma.seller.findUnique({ where: { id } });
    if (!s) throw new NotFoundException();
    return this.prisma.seller.update({ where: { id }, data: { status: 'APPROVED', approvedBy: adminId, approvedAt: new Date() } });
  }

  async reject(id: string, reason: string) {
    return this.prisma.seller.update({ where: { id }, data: { status: 'REJECTED', rejectionReason: reason } });
  }

  async suspend(id: string) {
    return this.prisma.seller.update({ where: { id }, data: { status: 'SUSPENDED' } });
  }

  async reactivate(id: string) {
    return this.prisma.seller.update({ where: { id }, data: { status: 'APPROVED' } });
  }

  getMe(userId: string) {
    return this.prisma.seller.findUnique({
      where: { userId },
      include: { store: true, subscriptions: { where: { isActive: true }, include: { plan: true }, take: 1 } }
    });
  }
}
