"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var BadgesService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.BadgesService = exports.BADGE = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
exports.BADGE = {
    VERIFIED: 'VERIFIED',
    TOP_SELLER: 'TOP_SELLER',
    PREMIUM_SHOP: 'PREMIUM_SHOP',
    FAST_REPLY: 'FAST_REPLY',
    EXCELLENT: 'EXCELLENT',
    SALES_100: 'SALES_100',
    SALES_500: 'SALES_500',
    SALES_1000: 'SALES_1000',
    NEW_SELLER: 'NEW_SELLER',
    TRUSTED: 'TRUSTED',
};
let BadgesService = BadgesService_1 = class BadgesService {
    constructor(prisma) {
        this.prisma = prisma;
        this.logger = new common_1.Logger(BadgesService_1.name);
    }
    async computeBadges(storeId) {
        const store = await this.prisma.store.findUnique({
            where: { id: storeId },
            include: {
                seller: {
                    include: {
                        subscriptions: {
                            where: { isActive: true },
                            include: { plan: { select: { tier: true } } },
                            orderBy: { endDate: 'desc' },
                            take: 1,
                        },
                    },
                },
            },
        });
        if (!store)
            return [];
        const complaintCount = await this.prisma.complaint.count({
            where: { storeId, status: { in: ['CONFIRMED', 'RESOLVED_AGAINST_SELLER'] } },
        });
        const subscriptionTier = store.seller?.subscriptions?.[0]?.plan?.tier || null;
        const ageInDays = Math.floor((Date.now() - store.createdAt.getTime()) / 86400000);
        const stats = {
            storeId,
            totalSales: store.totalSales,
            totalReviews: store.totalReviews,
            avgRating: store.avgRating,
            isVerified: store.isVerified,
            avgResponseTime: store.avgResponseTime,
            subscriptionTier,
            complaintCount,
            createdAt: store.createdAt,
        };
        const badges = [];
        if (stats.isVerified)
            badges.push(exports.BADGE.VERIFIED);
        if (stats.totalSales >= 1000)
            badges.push(exports.BADGE.SALES_1000);
        else if (stats.totalSales >= 500)
            badges.push(exports.BADGE.SALES_500);
        else if (stats.totalSales >= 100)
            badges.push(exports.BADGE.SALES_100);
        if (stats.avgRating >= 4.8 && stats.totalReviews >= 20)
            badges.push(exports.BADGE.EXCELLENT);
        if (stats.avgResponseTime !== null && stats.avgResponseTime <= 60)
            badges.push(exports.BADGE.FAST_REPLY);
        if (subscriptionTier === 'PREMIUM' || subscriptionTier === 'ENTERPRISE')
            badges.push(exports.BADGE.PREMIUM_SHOP);
        if (stats.totalSales >= 50 && stats.avgRating >= 4.5 && stats.complaintCount === 0)
            badges.push(exports.BADGE.TRUSTED);
        if (stats.totalSales >= 200 && stats.avgRating >= 4.7 && stats.isVerified)
            badges.push(exports.BADGE.TOP_SELLER);
        if (ageInDays <= 30 && stats.totalSales === 0)
            badges.push(exports.BADGE.NEW_SELLER);
        return badges;
    }
    computeReputationScore(stats) {
        let score = 500;
        if (stats.avgRating) {
            score += (stats.avgRating - 3) * 100;
        }
        if (stats.totalSales) {
            if (stats.totalSales >= 1000)
                score += 150;
            else if (stats.totalSales >= 500)
                score += 100;
            else if (stats.totalSales >= 100)
                score += 60;
            else if (stats.totalSales >= 10)
                score += 20;
        }
        score -= (stats.complaintCount || 0) * 80;
        score -= Math.min((stats.unrespondedOrders || 0) * 20, 200);
        if (stats.avgResponseTime !== null && stats.avgResponseTime !== undefined && stats.avgResponseTime <= 60)
            score += 50;
        const badgeBonus = {
            VERIFIED: 30, TOP_SELLER: 50, PREMIUM_SHOP: 20, EXCELLENT: 40,
            TRUSTED: 30, SALES_1000: 40, SALES_500: 25, SALES_100: 10,
        };
        for (const badge of (stats.badges || [])) {
            score += badgeBonus[badge] || 0;
        }
        return Math.max(0, Math.min(1000, Math.round(score)));
    }
    async refreshStore(storeId) {
        try {
            const badges = await this.computeBadges(storeId);
            const store = await this.prisma.store.findUnique({ where: { id: storeId } });
            if (!store)
                return;
            const complaintCount = await this.prisma.complaint.count({
                where: { storeId, status: { in: ['CONFIRMED', 'RESOLVED_AGAINST_SELLER'] } },
            });
            const unrespondedOrders = await this.prisma.order.count({
                where: { storeId, status: 'PENDING', createdAt: { lt: new Date(Date.now() - 24 * 3600000) } },
            });
            const score = this.computeReputationScore({
                avgRating: store.avgRating,
                totalSales: store.totalSales,
                complaintCount,
                unrespondedOrders,
                avgResponseTime: store.avgResponseTime,
                badges,
            });
            await this.prisma.store.update({
                where: { id: storeId },
                data: { badges, reputationScore: score, lastBadgeUpdate: new Date() },
            });
            this.logger.log(`Store ${storeId} → badges=[${badges.join(',')}] score=${score}`);
        }
        catch (err) {
            this.logger.error(`refreshStore(${storeId}): ${err.message}`);
        }
    }
    async refreshAll() {
        const stores = await this.prisma.store.findMany({
            where: { isActive: true },
            select: { id: true },
        });
        for (const s of stores) {
            await this.refreshStore(s.id);
        }
        this.logger.log(`Refreshed badges for ${stores.length} stores`);
    }
    getBadgeMeta(badge) {
        const meta = {
            VERIFIED: { label: 'Vendeur Vérifié', color: '#3B82F6', icon: '✓' },
            TOP_SELLER: { label: 'Top Vendeur', color: '#F59E0B', icon: '⭐' },
            PREMIUM_SHOP: { label: 'Boutique Premium', color: '#8B5CF6', icon: '💎' },
            FAST_REPLY: { label: 'Réponse Rapide', color: '#10B981', icon: '⚡' },
            EXCELLENT: { label: 'Excellent Service', color: '#EF4444', icon: '🏆' },
            SALES_100: { label: '100 Ventes+', color: '#6366F1', icon: '🎯' },
            SALES_500: { label: '500 Ventes+', color: '#EC4899', icon: '🚀' },
            SALES_1000: { label: '1000 Ventes+', color: '#FF9900', icon: '👑' },
            NEW_SELLER: { label: 'Nouveau Vendeur', color: '#14B8A6', icon: '🌟' },
            TRUSTED: { label: 'Vendeur de Confiance', color: '#059669', icon: '🛡️' },
        };
        return meta[badge] || { label: badge, color: '#6B7280', icon: '•' };
    }
};
exports.BadgesService = BadgesService;
exports.BadgesService = BadgesService = BadgesService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], BadgesService);
//# sourceMappingURL=badges.service.js.map