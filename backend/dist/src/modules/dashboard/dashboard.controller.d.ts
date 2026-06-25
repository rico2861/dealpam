import { DashboardService } from './dashboard.service';
export declare class DashboardController {
    private ds;
    constructor(ds: DashboardService);
    getAdminStats(): Promise<{
        totalUsers: number;
        totalSellers: number;
        pendingSellers: number;
        totalProducts: number;
        pendingProducts: number;
        totalOrders: number;
        activeSubscriptions: number;
    }>;
    getSellerStats(u: any): Promise<{
        products?: undefined;
        orders?: undefined;
        revenue?: undefined;
    } | {
        products: number;
        orders: number;
        revenue: number | import("@prisma/client/runtime/library").Decimal;
    }>;
}
