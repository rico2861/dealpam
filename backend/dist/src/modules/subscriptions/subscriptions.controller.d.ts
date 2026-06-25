import { SubscriptionsService } from './subscriptions.service';
export declare class SubscriptionsController {
    private ss;
    constructor(ss: SubscriptionsService);
    getPlans(): import(".prisma/client").Prisma.PrismaPromise<{
        id: string;
        tier: import(".prisma/client").$Enums.SubscriptionTier;
        name: string;
        priceHTG: import("@prisma/client/runtime/library").Decimal;
        maxProducts: number | null;
        maxImages: number;
        hasVerifiedBadge: boolean;
        hasEliteBadge: boolean;
        hasPrioritySearch: boolean;
        hasHomepageAd: boolean;
        hasAdvancedStats: boolean;
        hasAutoSponsored: boolean;
        description: string | null;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
    }[]>;
    subscribe(u: any, planId: string): Promise<{
        plan: {
            id: string;
            tier: import(".prisma/client").$Enums.SubscriptionTier;
            name: string;
            priceHTG: import("@prisma/client/runtime/library").Decimal;
            maxProducts: number | null;
            maxImages: number;
            hasVerifiedBadge: boolean;
            hasEliteBadge: boolean;
            hasPrioritySearch: boolean;
            hasHomepageAd: boolean;
            hasAdvancedStats: boolean;
            hasAutoSponsored: boolean;
            description: string | null;
            isActive: boolean;
            createdAt: Date;
            updatedAt: Date;
        };
    } & {
        id: string;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        sellerId: string;
        startDate: Date;
        endDate: Date;
        autoRenew: boolean;
        planId: string;
    }>;
    getMySubscription(u: any): Promise<{
        plan: {
            id: string;
            tier: import(".prisma/client").$Enums.SubscriptionTier;
            name: string;
            priceHTG: import("@prisma/client/runtime/library").Decimal;
            maxProducts: number | null;
            maxImages: number;
            hasVerifiedBadge: boolean;
            hasEliteBadge: boolean;
            hasPrioritySearch: boolean;
            hasHomepageAd: boolean;
            hasAdvancedStats: boolean;
            hasAutoSponsored: boolean;
            description: string | null;
            isActive: boolean;
            createdAt: Date;
            updatedAt: Date;
        };
    } & {
        id: string;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        sellerId: string;
        startDate: Date;
        endDate: Date;
        autoRenew: boolean;
        planId: string;
    }>;
    getAll(p: number): import(".prisma/client").Prisma.PrismaPromise<({
        seller: {
            user: {
                email: string;
                firstName: string;
                lastName: string;
            };
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            status: import(".prisma/client").$Enums.SellerStatus;
            businessType: import(".prisma/client").$Enums.BusinessType | null;
            businessCity: string | null;
            businessDept: string | null;
            businessAddress: string | null;
            nif: string | null;
            idDocumentUrl: string | null;
            businessDocUrl: string | null;
            rejectionReason: string | null;
            approvedBy: string | null;
            approvedAt: Date | null;
            userId: string;
        };
        plan: {
            id: string;
            tier: import(".prisma/client").$Enums.SubscriptionTier;
            name: string;
            priceHTG: import("@prisma/client/runtime/library").Decimal;
            maxProducts: number | null;
            maxImages: number;
            hasVerifiedBadge: boolean;
            hasEliteBadge: boolean;
            hasPrioritySearch: boolean;
            hasHomepageAd: boolean;
            hasAdvancedStats: boolean;
            hasAutoSponsored: boolean;
            description: string | null;
            isActive: boolean;
            createdAt: Date;
            updatedAt: Date;
        };
    } & {
        id: string;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        sellerId: string;
        startDate: Date;
        endDate: Date;
        autoRenew: boolean;
        planId: string;
    })[]>;
}
