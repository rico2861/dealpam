import { PrismaService } from '../../prisma/prisma.service';
export declare class StoresService {
    private prisma;
    constructor(prisma: PrismaService);
    findAll(page?: number, limit?: number): import(".prisma/client").Prisma.PrismaPromise<({
        seller: {
            subscriptions: ({
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
            })[];
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
        _count: {
            products: number;
        };
    } & {
        id: string;
        name: string;
        description: string | null;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        slug: string;
        email: string | null;
        phone: string | null;
        city: string | null;
        department: string | null;
        address: string | null;
        logoUrl: string | null;
        bannerUrl: string | null;
        whatsapp: string | null;
        avgRating: number;
        totalReviews: number;
        totalSales: number;
        isVerified: boolean;
        badges: string[];
        reputationScore: number;
        avgResponseTime: number | null;
        lastBadgeUpdate: Date | null;
        sellerId: string;
    })[]>;
    findBySlug(slug: string): Promise<{
        seller: {
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
        _count: {
            products: number;
            reviews: number;
        };
    } & {
        id: string;
        name: string;
        description: string | null;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        slug: string;
        email: string | null;
        phone: string | null;
        city: string | null;
        department: string | null;
        address: string | null;
        logoUrl: string | null;
        bannerUrl: string | null;
        whatsapp: string | null;
        avgRating: number;
        totalReviews: number;
        totalSales: number;
        isVerified: boolean;
        badges: string[];
        reputationScore: number;
        avgResponseTime: number | null;
        lastBadgeUpdate: Date | null;
        sellerId: string;
    }>;
    updateMe(userId: string, data: any): Promise<{
        id: string;
        name: string;
        description: string | null;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        slug: string;
        email: string | null;
        phone: string | null;
        city: string | null;
        department: string | null;
        address: string | null;
        logoUrl: string | null;
        bannerUrl: string | null;
        whatsapp: string | null;
        avgRating: number;
        totalReviews: number;
        totalSales: number;
        isVerified: boolean;
        badges: string[];
        reputationScore: number;
        avgResponseTime: number | null;
        lastBadgeUpdate: Date | null;
        sellerId: string;
    }>;
}
