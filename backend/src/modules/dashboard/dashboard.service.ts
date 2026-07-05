import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  async getAdminStats() {
    // Exclut le staff interne (admin, modérateurs, etc.) — seuls les vrais clients/vendeurs comptent
    const STAFF_ROLES = ['ADMIN', 'SUPER_ADMIN', 'MODERATOR', 'CUSTOMER_CARE', 'PARTNER', 'ACCOUNTANT'];
    const [totalUsers, totalSellers, pendingSellers, totalProducts, pendingProducts, totalOrders, activeSubscriptions] = await Promise.all([
      this.prisma.user.count({ where: { role: { notIn: STAFF_ROLES as any } } }),
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
    const seller = await this.prisma.seller.findUnique({
      where: { userId },
      include: {
        stores:        { select: { id: true, name: true, isPrimary: true, avgRating: true, totalReviews: true, totalSales: true, isVerified: true } },
        subscriptions: { where: { isActive: true }, include: { plan: true }, take: 1 },
        documents:     { select: { id: true, type: true, isValid: true } },
      },
    });

    if (!seller) return { stores: [], products: 0, orders: 0, revenue: 0 };

    const storeIds = seller.stores.map((s: any) => s.id);

    const [products, orders, revenue, pendingOrders, recentOrders, lowStockCount] = await Promise.all([
      this.prisma.product.count({ where: { storeId: { in: storeIds } } }),
      this.prisma.order.count({ where: { storeId: { in: storeIds } } }),
      this.prisma.order.aggregate({ where: { storeId: { in: storeIds }, status: 'DELIVERED' }, _sum: { totalHTG: true } }),
      this.prisma.order.count({ where: { storeId: { in: storeIds }, status: 'PENDING' } }),
      this.prisma.order.findMany({
        where: { storeId: { in: storeIds } },
        orderBy: { createdAt: 'desc' }, take: 5,
        select: {
          id: true, status: true, totalHTG: true, createdAt: true,
          items: { take: 1, select: { product: { select: { name: true } } } },
          user: { select: { firstName: true, lastName: true } },
        },
      }),
      this.prisma.product.count({ where: { storeId: { in: storeIds }, stock: { lte: 5 }, status: 'PUBLISHED' } }),
    ]);

    // Per-store breakdown
    const storeStats = await Promise.all(
      seller.stores.map(async (store: any) => {
        const [pCount, oCount, rev] = await Promise.all([
          this.prisma.product.count({ where: { storeId: store.id } }),
          this.prisma.order.count({ where: { storeId: store.id } }),
          this.prisma.order.aggregate({ where: { storeId: store.id, status: 'DELIVERED' }, _sum: { totalHTG: true } }),
        ]);
        return { ...store, productCount: pCount, orderCount: oCount, revenue: Number(rev._sum.totalHTG || 0) };
      }),
    );

    // Monthly revenue — last 6 months
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    const monthlyOrders = await this.prisma.order.findMany({
      where: { storeId: { in: storeIds }, status: 'DELIVERED', createdAt: { gte: sixMonthsAgo } },
      select: { createdAt: true, totalHTG: true },
    });
    const monthlyMap: Record<string, number> = {};
    for (const o of monthlyOrders) {
      const key = `${o.createdAt.getFullYear()}-${String(o.createdAt.getMonth() + 1).padStart(2, '0')}`;
      monthlyMap[key] = (monthlyMap[key] || 0) + Number(o.totalHTG);
    }
    const monthlyRevenue: { month: string; revenue: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      monthlyRevenue.push({ month: d.toLocaleString('fr-FR', { month: 'short', year: '2-digit' }), revenue: Math.round(monthlyMap[key] || 0) });
    }

    return {
      stores: storeStats, storeCount: seller.stores.length,
      products, orders, revenue: Number(revenue._sum.totalHTG || 0),
      pendingOrders, lowStockCount,
      recentOrders, monthlyRevenue,
      subscription: seller.subscriptions[0] ?? null,
      documents: seller.documents,
      isVerified: seller.stores.some((s: any) => s.isVerified),
      sellerStatus: seller.status,
    };
  }
}
