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

  /**
   * Period-aware seller statistics with plan-tier gating info.
   * `period`: '7d' | '30d' | '90d' | 'custom'. For 'custom', `from`/`to` (ISO strings) are used.
   */
  async getSellerStatistics(userId: string, period: string, from?: string, to?: string) {
    const seller = await this.prisma.seller.findUnique({
      where: { userId },
      include: {
        stores: { select: { id: true, name: true, avgRating: true, totalReviews: true } },
        subscriptions: { where: { isActive: true }, include: { plan: true }, take: 1 },
      },
    });

    if (!seller) return null;

    const storeIds = seller.stores.map((s: any) => s.id);
    const plan = seller.subscriptions[0]?.plan ?? null;
    const hasAdvancedStats = !!plan?.hasAdvancedStats;

    // Resolve period boundaries + preceding period of equal length (for trend comparison)
    const now = new Date();
    let periodStart: Date;
    let periodEnd: Date = now;
    if (period === 'custom' && from) {
      periodStart = new Date(from);
      periodEnd = to ? new Date(`${to}T23:59:59.999`) : now;
    } else if (period === '90d') {
      periodStart = new Date(now); periodStart.setDate(periodStart.getDate() - 90);
    } else if (period === '30d') {
      periodStart = new Date(now); periodStart.setDate(periodStart.getDate() - 30);
    } else {
      periodStart = new Date(now); periodStart.setDate(periodStart.getDate() - 7);
    }
    const durationMs = periodEnd.getTime() - periodStart.getTime();
    const prevPeriodEnd = new Date(periodStart.getTime());
    const prevPeriodStart = new Date(periodStart.getTime() - durationMs);

    const [
      currentRevenueAgg, prevRevenueAgg,
      orderCount, pendingCount,
      prevOrderCount,
      productStatusCounts,
    ] = await Promise.all([
      this.prisma.order.aggregate({ where: { storeId: { in: storeIds }, status: 'DELIVERED', createdAt: { gte: periodStart, lte: periodEnd } }, _sum: { totalHTG: true } }),
      this.prisma.order.aggregate({ where: { storeId: { in: storeIds }, status: 'DELIVERED', createdAt: { gte: prevPeriodStart, lt: prevPeriodEnd } }, _sum: { totalHTG: true } }),
      this.prisma.order.count({ where: { storeId: { in: storeIds }, createdAt: { gte: periodStart, lte: periodEnd } } }),
      this.prisma.order.count({ where: { storeId: { in: storeIds }, status: 'PENDING', createdAt: { gte: periodStart, lte: periodEnd } } }),
      this.prisma.order.count({ where: { storeId: { in: storeIds }, createdAt: { gte: prevPeriodStart, lt: prevPeriodEnd } } }),
      this.prisma.product.groupBy({ by: ['status'], where: { storeId: { in: storeIds } }, _count: { _all: true } }),
    ]);

    const revenue = Number(currentRevenueAgg._sum.totalHTG || 0);
    const prevRevenue = Number(prevRevenueAgg._sum.totalHTG || 0);
    const revenueTrendPct = prevRevenue > 0 ? Math.round(((revenue - prevRevenue) / prevRevenue) * 100) : (revenue > 0 ? 100 : 0);
    const avgOrderValue = orderCount > 0 ? Math.round(revenue / orderCount) : 0;

    // Views: lifetime running counter on Product, no timestamped log exists in schema
    // -> cannot be period-scoped honestly, returned as a clearly-labeled lifetime total.
    const viewsAgg = await this.prisma.product.aggregate({ where: { storeId: { in: storeIds } }, _sum: { viewCount: true } });
    const totalViewsLifetime = Number(viewsAgg._sum.viewCount || 0);

    // Rating: aggregate across seller's stores, weighted by each store's totalReviews
    // (a store with more reviews contributes proportionally more to the seller-wide average).
    const totalReviews = seller.stores.reduce((sum: number, s: any) => sum + (s.totalReviews || 0), 0);
    const avgRating = totalReviews > 0
      ? seller.stores.reduce((sum: number, s: any) => sum + (s.avgRating || 0) * (s.totalReviews || 0), 0) / totalReviews
      : 0;

    const productStatusBreakdown = {
      PUBLISHED: 0, PENDING_REVIEW: 0, DRAFT: 0, REJECTED: 0, ARCHIVED: 0, SUSPENDED: 0,
    } as Record<string, number>;
    for (const row of productStatusCounts as any[]) {
      productStatusBreakdown[row.status] = row._count._all;
    }

    // Basic response — always returned regardless of plan tier
    const base = {
      period, periodStart, periodEnd,
      hasAdvancedStats,
      planTier: plan?.tier ?? null,
      revenue, revenueTrendPct,
      orderCount, pendingCount, avgOrderValue,
      totalViewsLifetime,
      avgRating: Math.round(avgRating * 10) / 10, totalReviews,
      productStatusBreakdown,
    };

    if (!hasAdvancedStats) return base;

    // Advanced sections (gated by hasAdvancedStats)
    const [orderStatusCounts, revenueOrders, topProductRows] = await Promise.all([
      this.prisma.order.groupBy({ by: ['status'], where: { storeId: { in: storeIds }, createdAt: { gte: periodStart, lte: periodEnd } }, _count: { _all: true } }),
      this.prisma.order.findMany({
        where: { storeId: { in: storeIds }, status: 'DELIVERED', createdAt: { gte: periodStart, lte: periodEnd } },
        select: { createdAt: true, totalHTG: true },
      }),
      this.prisma.orderItem.groupBy({
        by: ['productId', 'productName'],
        where: { order: { storeId: { in: storeIds }, status: 'DELIVERED', createdAt: { gte: periodStart, lte: periodEnd } } },
        _sum: { subtotal: true, quantity: true },
        orderBy: { _sum: { subtotal: 'desc' } },
        take: 10,
      }),
    ]);

    const orderStatusBreakdown = {
      PENDING: 0, CONFIRMED: 0, PREPARING: 0, SHIPPED: 0, DELIVERED: 0, CANCELLED: 0, REFUNDED: 0,
    } as Record<string, number>;
    for (const row of orderStatusCounts as any[]) {
      orderStatusBreakdown[row.status] = row._count._all;
    }

    const topProducts = topProductRows.map((r: any) => ({
      productId: r.productId,
      name: r.productName,
      revenue: Number(r._sum.subtotal || 0),
      quantitySold: r._sum.quantity || 0,
    }));

    // Time-series bucketing: daily for 7d/30d, weekly for 90d/custom>30d — reuses the
    // monthly-bucketing pattern from getSellerStats but keyed by day/week instead of month.
    const bucketByWeek = period === '90d' || durationMs > 30 * 24 * 60 * 60 * 1000;
    const bucketMap: Record<string, number> = {};
    const bucketKey = (d: Date) => {
      if (bucketByWeek) {
        const weekStart = new Date(d);
        weekStart.setDate(weekStart.getDate() - weekStart.getDay());
        return weekStart.toISOString().slice(0, 10);
      }
      return d.toISOString().slice(0, 10);
    };
    for (const o of revenueOrders) {
      const key = bucketKey(o.createdAt);
      bucketMap[key] = (bucketMap[key] || 0) + Number(o.totalHTG);
    }
    const revenueSeries = Object.keys(bucketMap).sort().map(key => ({
      label: bucketByWeek
        ? `Sem. ${new Date(key).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}`
        : new Date(key).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }),
      revenue: Math.round(bucketMap[key]),
    }));

    return { ...base, orderStatusBreakdown, topProducts, revenueSeries };
  }
}
