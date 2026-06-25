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
exports.AdsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
const CPM = 15;
const CPC = 8;
const CPA = 25;
let AdsService = class AdsService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async createCampaign(sellerId, dto) {
        const seller = await this.prisma.seller.findUnique({ where: { id: sellerId }, include: { store: true } });
        if (!seller || seller.status !== 'APPROVED')
            throw new common_1.ForbiddenException('Boutique non approuvée');
        const product = await this.prisma.product.findFirst({ where: { id: dto.productId, store: { sellerId } } });
        if (!product)
            throw new common_1.NotFoundException('Produit introuvable');
        const start = new Date(dto.startDate);
        const end = new Date(dto.endDate);
        if (end <= start)
            throw new common_1.BadRequestException('La date de fin doit être après la date de début');
        if (start < new Date())
            throw new common_1.BadRequestException('La date de début ne peut pas être dans le passé');
        return this.prisma.adCampaign.create({
            data: {
                sellerId,
                productId: dto.productId,
                name: dto.name,
                objective: dto.objective || 'TRAFFIC',
                totalBudget: dto.totalBudget,
                dailyBudget: dto.dailyBudget || null,
                startDate: start,
                endDate: end,
                targetGenders: dto.targetGenders || [],
                targetAgeMin: dto.targetAgeMin || null,
                targetAgeMax: dto.targetAgeMax || null,
                targetDepts: dto.targetDepts || [],
                targetCategories: dto.targetCategories || [],
                status: 'PENDING_PAYMENT',
            },
            include: { product: { include: { images: { where: { isPrimary: true }, take: 1 } } } },
        });
    }
    async getMyCampaigns(sellerId, page = 1) {
        const [data, total] = await Promise.all([
            this.prisma.adCampaign.findMany({
                where: { sellerId },
                orderBy: { createdAt: 'desc' },
                skip: (page - 1) * 20,
                take: 20,
                include: {
                    product: { include: { images: { where: { isPrimary: true }, take: 1 } } },
                    _count: { select: { events: true } },
                },
            }),
            this.prisma.adCampaign.count({ where: { sellerId } }),
        ]);
        return { data, total, page };
    }
    async getCampaignStats(campaignId, sellerId) {
        const campaign = await this.prisma.adCampaign.findFirst({
            where: { id: campaignId, sellerId },
            include: { product: { include: { images: { where: { isPrimary: true }, take: 1 } } } },
        });
        if (!campaign)
            throw new common_1.NotFoundException('Campagne introuvable');
        const events = await this.prisma.adEvent.findMany({
            where: { campaignId, createdAt: { gte: new Date(Date.now() - 30 * 86400000) } },
            select: { type: true, cost: true, createdAt: true },
        });
        const daily = {};
        for (const e of events) {
            const d = e.createdAt.toISOString().slice(0, 10);
            if (!daily[d])
                daily[d] = { impressions: 0, clicks: 0, conversions: 0, spent: 0 };
            if (e.type === 'IMPRESSION')
                daily[d].impressions++;
            if (e.type === 'CLICK')
                daily[d].clicks++;
            if (e.type === 'CONVERSION')
                daily[d].conversions++;
            daily[d].spent += Number(e.cost);
        }
        const ctr = campaign.impressions > 0 ? ((campaign.clicks / campaign.impressions) * 100).toFixed(2) : '0.00';
        const cpc = campaign.clicks > 0 ? (Number(campaign.spent) / campaign.clicks).toFixed(2) : '0.00';
        const remaining = Number(campaign.totalBudget) - Number(campaign.spent);
        const daysLeft = Math.max(0, Math.ceil((campaign.endDate.getTime() - Date.now()) / 86400000));
        return { campaign, ctr, cpc, remaining, daysLeft, daily: Object.entries(daily).map(([date, v]) => ({ date, ...v })) };
    }
    async pauseCampaign(campaignId, sellerId) {
        const c = await this.prisma.adCampaign.findFirst({ where: { id: campaignId, sellerId } });
        if (!c)
            throw new common_1.NotFoundException('Campagne introuvable');
        if (c.status !== 'ACTIVE')
            throw new common_1.BadRequestException('Seules les campagnes actives peuvent être mises en pause');
        return this.prisma.adCampaign.update({ where: { id: campaignId }, data: { status: 'PAUSED' } });
    }
    async resumeCampaign(campaignId, sellerId) {
        const c = await this.prisma.adCampaign.findFirst({ where: { id: campaignId, sellerId } });
        if (!c)
            throw new common_1.NotFoundException('Campagne introuvable');
        if (c.status !== 'PAUSED')
            throw new common_1.BadRequestException('Seules les campagnes en pause peuvent être relancées');
        return this.prisma.adCampaign.update({ where: { id: campaignId }, data: { status: 'ACTIVE' } });
    }
    async cancelCampaign(campaignId, sellerId) {
        const c = await this.prisma.adCampaign.findFirst({ where: { id: campaignId, sellerId } });
        if (!c)
            throw new common_1.NotFoundException('Campagne introuvable');
        if (['COMPLETED', 'CANCELLED'].includes(c.status))
            throw new common_1.BadRequestException('Impossible d\'annuler cette campagne');
        return this.prisma.adCampaign.update({ where: { id: campaignId }, data: { status: 'CANCELLED' } });
    }
    async getAllCampaigns(page = 1, status) {
        const where = {};
        if (status)
            where.status = status;
        const [data, total] = await Promise.all([
            this.prisma.adCampaign.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                skip: (page - 1) * 30,
                take: 30,
                include: {
                    product: { include: { images: { where: { isPrimary: true }, take: 1 } } },
                    seller: { include: { user: { select: { firstName: true, lastName: true, email: true } }, store: { select: { name: true } } } },
                },
            }),
            this.prisma.adCampaign.count({ where }),
        ]);
        const stats = await this.prisma.adCampaign.aggregate({
            _sum: { totalBudget: true, spent: true },
            _count: { id: true },
            where: { status: 'ACTIVE' },
        });
        return { data, total, page, stats };
    }
    async reviewCampaign(campaignId, adminId, action, note) {
        const c = await this.prisma.adCampaign.findUnique({ where: { id: campaignId } });
        if (!c)
            throw new common_1.NotFoundException('Campagne introuvable');
        if (c.status !== 'PENDING_REVIEW')
            throw new common_1.BadRequestException('Campagne non en attente de revue');
        return this.prisma.adCampaign.update({
            where: { id: campaignId },
            data: {
                status: action === 'approve' ? 'ACTIVE' : 'REJECTED',
                reviewNote: note || null,
                reviewedBy: adminId,
                reviewedAt: new Date(),
            },
        });
    }
    async adminForceStatus(campaignId, status) {
        return this.prisma.adCampaign.update({
            where: { id: campaignId },
            data: { status: status },
        });
    }
    async getAdsForUser(opts) {
        const { department, gender, age, limit = 8 } = opts;
        const now = new Date();
        const campaigns = await this.prisma.adCampaign.findMany({
            where: {
                status: 'ACTIVE',
                startDate: { lte: now },
                endDate: { gte: now },
            },
            include: {
                product: {
                    where: { status: 'PUBLISHED', stock: { gt: 0 } },
                    include: {
                        images: { where: { isPrimary: true }, take: 1 },
                        store: { select: { name: true, slug: true, isVerified: true } },
                        category: { select: { name: true, slug: true } },
                    },
                },
            },
        });
        const scored = campaigns
            .filter(c => c.product)
            .map(c => {
            let score = 100;
            const remaining = Number(c.totalBudget) - Number(c.spent);
            if (remaining <= 0)
                return null;
            score += Math.min(remaining / 100, 50);
            if (c.targetDepts.length > 0) {
                if (department && c.targetDepts.some(d => d.toLowerCase() === department.toLowerCase())) {
                    score += 40;
                }
                else if (department) {
                    score -= 30;
                }
            }
            if (c.targetGenders.length > 0 && !c.targetGenders.includes('ALL')) {
                if (gender && c.targetGenders.includes(gender))
                    score += 20;
                else
                    score -= 15;
            }
            if (c.targetAgeMin && age && age < c.targetAgeMin)
                score -= 25;
            if (c.targetAgeMax && age && age > c.targetAgeMax)
                score -= 25;
            if (c.objective === 'AWARENESS')
                score += 10;
            if (c.objective === 'TRAFFIC')
                score += 5;
            return { campaign: c, product: c.product, score };
        })
            .filter(Boolean)
            .sort((a, b) => b.score - a.score)
            .slice(0, limit);
        return scored.map(s => ({
            ...s.product,
            _adCampaignId: s.campaign.id,
            _isSponsored: true,
        }));
    }
    async trackEvent(campaignId, type, userId, userDept) {
        const c = await this.prisma.adCampaign.findUnique({ where: { id: campaignId } });
        if (!c || c.status !== 'ACTIVE')
            return;
        const cost = type === 'IMPRESSION' ? CPM / 1000 : type === 'CLICK' ? CPC : CPA;
        if (Number(c.spent) + cost > Number(c.totalBudget)) {
            await this.prisma.adCampaign.update({ where: { id: campaignId }, data: { status: 'COMPLETED' } });
            return;
        }
        await Promise.all([
            this.prisma.adEvent.create({
                data: { campaignId, type, userId: userId || null, userDept: userDept || null, cost },
            }),
            this.prisma.adCampaign.update({
                where: { id: campaignId },
                data: {
                    spent: { increment: cost },
                    impressions: type === 'IMPRESSION' ? { increment: 1 } : undefined,
                    clicks: type === 'CLICK' ? { increment: 1 } : undefined,
                    conversions: type === 'CONVERSION' ? { increment: 1 } : undefined,
                },
            }),
        ]);
    }
    async getAdminStats() {
        const [total, active, pending, rejected, revenue] = await Promise.all([
            this.prisma.adCampaign.count(),
            this.prisma.adCampaign.count({ where: { status: 'ACTIVE' } }),
            this.prisma.adCampaign.count({ where: { status: 'PENDING_REVIEW' } }),
            this.prisma.adCampaign.count({ where: { status: 'REJECTED' } }),
            this.prisma.adCampaign.aggregate({ _sum: { spent: true } }),
        ]);
        return { total, active, pending, rejected, totalRevenue: revenue._sum.spent || 0 };
    }
};
exports.AdsService = AdsService;
exports.AdsService = AdsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], AdsService);
//# sourceMappingURL=ads.service.js.map