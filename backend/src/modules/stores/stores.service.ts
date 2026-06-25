import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class StoresService {
  constructor(private prisma: PrismaService) {}

  findAll(page = 1, limit = 20) {
    return this.prisma.store.findMany({
      where: { isActive: true },
      include: { seller: { include: { subscriptions: { where: { isActive: true }, include: { plan: true }, take: 1 } } }, _count: { select: { products: true } } },
      skip: (page-1)*limit, take: limit
    });
  }

  async findBySlug(slug: string) {
    const store = await this.prisma.store.findUnique({ where: { slug }, include: { seller: true, _count: { select: { products: true, reviews: true } } } });
    if (!store) throw new NotFoundException('Boutique introuvable');
    return store;
  }

  async updateMe(userId: string, data: any) {
    const seller = await this.prisma.seller.findUnique({ where: { userId } });
    if (!seller) throw new NotFoundException();
    return this.prisma.store.update({ where: { sellerId: seller.id }, data });
  }
}
