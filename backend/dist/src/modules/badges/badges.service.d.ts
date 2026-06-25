import { PrismaService } from '../../prisma/prisma.service';
export declare const BADGE: {
    readonly VERIFIED: "VERIFIED";
    readonly TOP_SELLER: "TOP_SELLER";
    readonly PREMIUM_SHOP: "PREMIUM_SHOP";
    readonly FAST_REPLY: "FAST_REPLY";
    readonly EXCELLENT: "EXCELLENT";
    readonly SALES_100: "SALES_100";
    readonly SALES_500: "SALES_500";
    readonly SALES_1000: "SALES_1000";
    readonly NEW_SELLER: "NEW_SELLER";
    readonly TRUSTED: "TRUSTED";
};
type BadgeKey = typeof BADGE[keyof typeof BADGE];
interface StoreStats {
    storeId: string;
    totalSales: number;
    totalReviews: number;
    avgRating: number;
    isVerified: boolean;
    avgResponseTime: number | null;
    subscriptionTier: string | null;
    complaintCount: number;
    createdAt: Date;
}
export declare class BadgesService {
    private prisma;
    private readonly logger;
    constructor(prisma: PrismaService);
    computeBadges(storeId: string): Promise<BadgeKey[]>;
    computeReputationScore(stats: Partial<StoreStats> & {
        unrespondedOrders?: number;
        badges?: BadgeKey[];
    }): number;
    refreshStore(storeId: string): Promise<void>;
    refreshAll(): Promise<void>;
    getBadgeMeta(badge: string): {
        label: string;
        color: string;
        icon: string;
    };
}
export {};
