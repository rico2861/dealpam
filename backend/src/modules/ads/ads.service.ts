import { Injectable, ForbiddenException, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateCampaignDto } from './create-campaign.dto';

// Cost per event (HTG)
const CPM = 15;   // coût pour 1 000 impressions
const CPC = 8;    // coût par clic
const CPA = 25;   // coût par conversion

@Injectable()
export class AdsService {
  constructor(private prisma: PrismaService) {}

  // ── SELLER ──────────────────────────────────────────────────────────────────

  async createCampaign(sellerId: string, dto: CreateCampaignDto) {
    const seller = await this.prisma.seller.findUnique({ where: { id: sellerId }, include: { store: true } });
    if (!seller || seller.status !== 'APPROVED') throw new ForbiddenException('Boutique non approuvée');

    const product = await this.prisma.product.findFirst({ where: { id: dto.productId, store: { sellerId } } });
    if (!product) throw new NotFoundException('Produit introuvable');

    const start = new Date(dto.startDate);
    const end = new Date(dto.endDate);
    if (end <= start) throw new BadRequestException('La date de fin doit être après la date de début');
    if (start < new Date()) throw new BadRequestException('La date de début ne peut pas être dans le passé');

    return this.prisma.adCampaign.create({
      data: {
        sellerId,
        productId: dto.productId,
        name: dto.name,
        objective: (dto.objective as any) || 'TRAFFIC',
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

  async getMyCampaigns(sellerId: string, page = 1) {
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

  async getCampaignStats(campaignId: string, sellerId: string) {
    const campaign = await this.prisma.adCampaign.findFirst({
      where: { id: campaignId, sellerId },
      include: { product: { include: { images: { where: { isPrimary: true }, take: 1 } } } },
    });
    if (!campaign) throw new NotFoundException('Campagne introuvable');

    // Daily breakdown last 30 days
    const events = await this.prisma.adEvent.findMany({
      where: { campaignId, createdAt: { gte: new Date(Date.now() - 30 * 86400000) } },
      select: { type: true, cost: true, createdAt: true },
    });

    const daily: Record<string, { impressions: number; clicks: number; conversions: number; spent: number }> = {};
    for (const e of events) {
      const d = e.createdAt.toISOString().slice(0, 10);
      if (!daily[d]) daily[d] = { impressions: 0, clicks: 0, conversions: 0, spent: 0 };
      if (e.type === 'IMPRESSION') daily[d].impressions++;
      if (e.type === 'CLICK') daily[d].clicks++;
      if (e.type === 'CONVERSION') daily[d].conversions++;
      daily[d].spent += Number(e.cost);
    }

    const ctr = campaign.impressions > 0 ? ((campaign.clicks / campaign.impressions) * 100).toFixed(2) : '0.00';
    const cpc = campaign.clicks > 0 ? (Number(campaign.spent) / campaign.clicks).toFixed(2) : '0.00';
    const remaining = Number(campaign.totalBudget) - Number(campaign.spent);
    const daysLeft = Math.max(0, Math.ceil((campaign.endDate.getTime() - Date.now()) / 86400000));

    return { campaign, ctr, cpc, remaining, daysLeft, daily: Object.entries(daily).map(([date, v]) => ({ date, ...v })) };
  }

  async pauseCampaign(campaignId: string, sellerId: string) {
    const c = await this.prisma.adCampaign.findFirst({ where: { id: campaignId, sellerId } });
    if (!c) throw new NotFoundException('Campagne introuvable');
    if (c.status !== 'ACTIVE') throw new BadRequestException('Seules les campagnes actives peuvent être mises en pause');
    return this.prisma.adCampaign.update({ where: { id: campaignId }, data: { status: 'PAUSED' } });
  }

  async resumeCampaign(campaignId: string, sellerId: string) {
    const c = await this.prisma.adCampaign.findFirst({ where: { id: campaignId, sellerId } });
    if (!c) throw new NotFoundException('Campagne introuvable');
    if (c.status !== 'PAUSED') throw new BadRequestException('Seules les campagnes en pause peuvent être relancées');
    return this.prisma.adCampaign.update({ where: { id: campaignId }, data: { status: 'ACTIVE' } });
  }

  async cancelCampaign(campaignId: string, sellerId: string) {
    const c = await this.prisma.adCampaign.findFirst({ where: { id: campaignId, sellerId } });
    if (!c) throw new NotFoundException('Campagne introuvable');
    if (['COMPLETED', 'CANCELLED'].includes(c.status)) throw new BadRequestException('Impossible d\'annuler cette campagne');
    return this.prisma.adCampaign.update({ where: { id: campaignId }, data: { status: 'CANCELLED' } });
  }

  // ── ADMIN ────────────────────────────────────────────────────────────────────

  async getAllCampaigns(page = 1, status?: string) {
    const where: any = {};
    if (status) where.status = status;

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

  async reviewCampaign(campaignId: string, adminId: string, action: 'approve' | 'reject', note?: string) {
    const c = await this.prisma.adCampaign.findUnique({ where: { id: campaignId } });
    if (!c) throw new NotFoundException('Campagne introuvable');
    if (c.status !== 'PENDING_REVIEW') throw new BadRequestException('Campagne non en attente de revue');

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

  async adminForceStatus(campaignId: string, status: string) {
    return this.prisma.adCampaign.update({
      where: { id: campaignId },
      data: { status: status as any },
    });
  }

  // ── AD SERVING ALGORITHM ─────────────────────────────────────────────────────
  // Called by products endpoint to fetch promoted products for a user

  async getAdsForUser(opts: { department?: string; gender?: string; age?: number; limit?: number }) {
    const { department, gender, age, limit = 8 } = opts;
    const now = new Date();

    // Find all active campaigns within budget
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

    // Score each campaign based on user match + remaining budget
    const scored = campaigns
      .filter(c => c.product) // product must exist and be published
      .map(c => {
        let score = 100;
        const remaining = Number(c.totalBudget) - Number(c.spent);
        if (remaining <= 0) return null;  // budget exhausted

        // Boost by remaining budget (higher budget = more visibility)
        score += Math.min(remaining / 100, 50);

        // Geo match
        if (c.targetDepts.length > 0) {
          if (department && c.targetDepts.some(d => d.toLowerCase() === department.toLowerCase())) {
            score += 40;
          } else if (department) {
            score -= 30; // penalize mismatch if campaign has geo targeting
          }
        }

        // Gender match
        if (c.targetGenders.length > 0 && !c.targetGenders.includes('ALL')) {
          if (gender && c.targetGenders.includes(gender)) score += 20;
          else score -= 15;
        }

        // Age match
        if (c.targetAgeMin && age && age < c.targetAgeMin) score -= 25;
        if (c.targetAgeMax && age && age > c.targetAgeMax) score -= 25;

        // Objective weight
        if (c.objective === 'AWARENESS') score += 10;
        if (c.objective === 'TRAFFIC') score += 5;

        return { campaign: c, product: c.product, score };
      })
      .filter(Boolean)
      .sort((a, b) => b!.score - a!.score)
      .slice(0, limit);

    return scored.map(s => ({
      ...s!.product,
      _adCampaignId: s!.campaign.id,
      _isSponsored: true,
    }));
  }

  // Track impression/click (called from controller)
  async trackEvent(campaignId: string, type: 'IMPRESSION' | 'CLICK' | 'CONVERSION', userId?: string, userDept?: string) {
    const c = await this.prisma.adCampaign.findUnique({ where: { id: campaignId } });
    if (!c || c.status !== 'ACTIVE') return;

    const cost = type === 'IMPRESSION' ? CPM / 1000 : type === 'CLICK' ? CPC : CPA;

    // Check budget
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

  // Admin dashboard stats
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
}
