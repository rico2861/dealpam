import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  async getAdminStats() {
    const [totalUsers, totalSellers, pendingSellers, totalProducts, pendingProducts, totalOrders, activeSubscriptions] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.seller.count(),
      this.prisma.seller.count({ where: { status: 'PENDING' } }),
      this.prisma.product.count({ where: { status: 'PUBLISHED' } }),
      this.prisma.product.count({ where: { status: 'PENDING_REVIEW' } }),
      this.prisma.order.count(),
      this.prisma.sellerSubscription.count({ where: { isActive: true, endDate: { gt: new Date() } } }),
    ]);
    return { totalUsers, totalSellers, pendingSellers, totalProducts, pendingProducts, totalOrders, activeSubscriptions };
  }

  async getSellerStats(userId: string) {
    const seller = await this.prisma.seller.findUnique({ where: { userId }, include: { store: true } });
    if (!seller?.store) return {};

    const [products, orders, revenue] = await Promise.all([
      this.prisma.product.count({ where: { storeId: seller.store.id } }),
      this.prisma.order.count({ where: { storeId: seller.store.id } }),
      this.prisma.order.aggregate({ where: { storeId: seller.store.id, status: 'DELIVERED' }, _sum: { totalHTG: true } }),
    ]);
    return { products, orders, revenue: revenue._sum.totalHTG || 0 };
  }
}
