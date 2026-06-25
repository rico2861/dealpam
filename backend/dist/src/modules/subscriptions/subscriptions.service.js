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
Object.defineProperty(exports, "__esModule", { value: true });
exports.SubscriptionsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
let SubscriptionsService = class SubscriptionsService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    getPlans() { return this.prisma.subscriptionPlan.findMany({ where: { isActive: true }, orderBy: { priceHTG: 'asc' } }); }
    async subscribe(userId, planId) {
        const seller = await this.prisma.seller.findUnique({ where: { userId } });
        await this.prisma.sellerSubscription.updateMany({ where: { sellerId: seller.id, isActive: true }, data: { isActive: false } });
        const startDate = new Date();
        const endDate = new Date();
        endDate.setMonth(endDate.getMonth() + 1);
        return this.prisma.sellerSubscription.create({
            data: { sellerId: seller.id, planId, startDate, endDate, isActive: true },
            include: { plan: true }
        });
    }
    async getMySubscription(userId) {
        const seller = await this.prisma.seller.findUnique({ where: { userId } });
        return this.prisma.sellerSubscription.findFirst({
            where: { sellerId: seller.id, isActive: true, endDate: { gt: new Date() } },
            include: { plan: true }
        });
    }
    getAll(page = 1) {
        return this.prisma.sellerSubscription.findMany({
            include: { seller: { include: { user: { select: { firstName: true, lastName: true, email: true } } } }, plan: true },
            skip: (page - 1) * 20, take: 20, orderBy: { createdAt: 'desc' }
        });
    }
    seedPlans() {
        const plans = [
            { tier: 'STARTER', name: 'Plan Starter', priceHTG: 500, maxProducts: 50, maxImages: 5 },
            { tier: 'BUSINESS', name: 'Plan Business', priceHTG: 1000, maxProducts: 130, maxImages: 10, hasVerifiedBadge: true, hasAdvancedStats: true },
            { tier: 'PREMIUM', name: 'Plan Premium', priceHTG: 2500, maxProducts: 300, maxImages: 10, hasVerifiedBadge: true, hasPrioritySearch: true, hasAdvancedStats: true },
            { tier: 'ELITE', name: 'Plan Elite', priceHTG: 5000, maxProducts: null, maxImages: 15, hasVerifiedBadge: true, hasEliteBadge: true, hasPrioritySearch: true, hasHomepageAd: true, hasAdvancedStats: true, hasAutoSponsored: true },
        ];
        return Promise.all(plans.map(p => this.prisma.subscriptionPlan.upsert({ where: { tier: p.tier }, create: p, update: p })));
    }
};
exports.SubscriptionsService = SubscriptionsService;
exports.SubscriptionsService = SubscriptionsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], SubscriptionsService);
//# sourceMappingURL=subscriptions.service.js.map