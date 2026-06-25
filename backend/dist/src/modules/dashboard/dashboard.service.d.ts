import { PrismaService } from '../../prisma/prisma.service';
export declare class DashboardService {
    private prisma;
    constructor(prisma: PrismaService);
    getAdminStats(): Promise<{
        totalUsers: number;
        totalSellers: number;
        pendingSellers: number;
        totalProducts: number;
        pendingProducts: number;
        totalOrders: number;
        activeSubscriptions: number;
    }>;
    getSellerStats(userId: string): Promise<{
        products?: undefined;
        orders?: undefined;
        revenue?: undefined;
    } | {
        products: number;
        orders: number;
        revenue: number | import("@prisma/client/runtime/library").Decimal;
    }>;
}
