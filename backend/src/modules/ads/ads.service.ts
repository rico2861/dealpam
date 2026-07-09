import { Injectable, ForbiddenException, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { WalletService } from '../wallet/wallet.service';
import { MoncashService } from '../moncash/moncash.service';
import { CreateCampaignDto } from './create-campaign.dto';

// Valeurs de repli si la table AdSettings est vide (ne devrait arriver
// qu'avant la première exécution de la migration/seed).
const DEFAULT_MIN_BUDGET = 250;
const DEFAULT_CPM = 150;  // coût pour 1 000 impressions
const DEFAULT_CPC = 25;   // coût par clic
const CPA = 25;   // coût par conversion (non exposé à l'admin pour l'instant)

@Injectable()
export class AdsService {
  constructor(
    private prisma: PrismaService,
    private walletService: WalletService,
    private moncash: MoncashService,
  ) {}

  // ── PRICING SETTINGS (admin-configurable) ───────────────────────────────────
  // Pas de mise en cache en mémoire ici : le volume de lecture est faible
  // (une lecture par création/évènement de campagne) et on veut que les
  // changements admin soient pris en compte immédiatement, sans redémarrage.
  async getSettings() {
    const row = await (this.prisma as any).adSettings.findUnique({ where: { id: 'default' } });
    if (!row) {
      return { minBudgetHTG: DEFAULT_MIN_BUDGET, cpmRateHTG: DEFAULT_CPM, cpcRateHTG: DEFAULT_CPC };
    }
    return {
      minBudgetHTG: Number(row.minBudgetHTG),
      cpmRateHTG: Number(row.cpmRateHTG),
      cpcRateHTG: Number(row.cpcRateHTG),
    };
  }

  async updateSettings(dto: { minBudgetHTG?: number; cpmRateHTG?: number; cpcRateHTG?: number }) {
    const data: any = {};
    if (dto.minBudgetHTG != null) {
      if (dto.minBudgetHTG < 1) throw new BadRequestException('Le budget minimum doit être positif');
      data.minBudgetHTG = dto.minBudgetHTG;
    }
    if (dto.cpmRateHTG != null) {
      if (dto.cpmRateHTG < 0) throw new BadRequestException('Le tarif CPM doit être positif');
      data.cpmRateHTG = dto.cpmRateHTG;
    }
    if (dto.cpcRateHTG != null) {
      if (dto.cpcRateHTG < 0) throw new BadRequestException('Le tarif CPC doit être positif');
      data.cpcRateHTG = dto.cpcRateHTG;
    }
    const updated = await (this.prisma as any).adSettings.upsert({
      where: { id: 'default' },
      create: { id: 'default', minBudgetHTG: data.minBudgetHTG ?? DEFAULT_MIN_BUDGET, cpmRateHTG: data.cpmRateHTG ?? DEFAULT_CPM, cpcRateHTG: data.cpcRateHTG ?? DEFAULT_CPC },
      update: data,
    });
    return {
      minBudgetHTG: Number(updated.minBudgetHTG),
      cpmRateHTG: Number(updated.cpmRateHTG),
      cpcRateHTG: Number(updated.cpcRateHTG),
    };
  }

  // ── SELLER ──────────────────────────────────────────────────────────────────

  async createCampaign(sellerId: string, dto: CreateCampaignDto) {
    const seller = await this.prisma.seller.findUnique({ where: { id: sellerId }, include: { stores: true } });
    if (!seller) throw new NotFoundException('Vendeur introuvable');
    if (seller.status !== 'APPROVED') {
      throw new ForbiddenException(
        seller.status === 'PENDING'
          ? 'Votre compte vendeur est en cours de vérification par notre équipe — les campagnes publicitaires seront disponibles dès son approbation.'
          : seller.status === 'REJECTED'
            ? 'Votre compte vendeur n\'est pas approuvé — corrigez et renvoyez vos documents depuis Profil & Documents pour débloquer les campagnes publicitaires.'
            : 'Votre compte vendeur doit être approuvé pour créer une campagne publicitaire.'
      );
    }

    if (!dto.productId && !dto.storeId) throw new BadRequestException('Sélectionnez un produit ou une boutique à promouvoir');

    const settings = await this.getSettings();
    if (dto.totalBudget < settings.minBudgetHTG) {
      throw new BadRequestException(`Le budget minimum est de ${settings.minBudgetHTG} HTG.`);
    }

    if (dto.productId) {
      const product = await this.prisma.product.findFirst({ where: { id: dto.productId, store: { sellerId } } });
      if (!product) throw new NotFoundException('Produit introuvable');
    }
    if (dto.storeId) {
      const store = await this.prisma.store.findFirst({ where: { id: dto.storeId, sellerId } });
      if (!store) throw new NotFoundException('Boutique introuvable');
      // Promouvoir une boutique entière expose potentiellement des produits non
      // vérifiés à un public plus large — seule une boutique verifiee peut donc
      // etre la cible d'une campagne "boutique". Promouvoir un seul produit ne
      // requiert pas cette verification.
      if (!store.isVerified) {
        throw new BadRequestException('Seules les boutiques vérifiées peuvent être promues. Demandez la vérification de votre boutique.');
      }
    }

    const start = new Date(dto.startDate);
    const end = new Date(dto.endDate);
    if (end <= start) throw new BadRequestException('La date de fin doit être après la date de début');
    if (start < new Date()) throw new BadRequestException('La date de début ne peut pas être dans le passé');

    // Le budget quotidien est un plafond de depense par jour — si plafond x
    // duree depasse le budget total, la campagne ne pourrait jamais tenir sa
    // duree prevue au rythme demande. On le refuse explicitement plutot que
    // de laisser la campagne s'arreter prematurement sans que le vendeur
    // comprenne pourquoi.
    if (dto.dailyBudget) {
      const days = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / 86_400_000));
      const maxPossibleSpend = dto.dailyBudget * days;
      if (maxPossibleSpend > dto.totalBudget) {
        throw new BadRequestException(
          `${dto.dailyBudget} HTG/jour × ${days} jour(s) = ${maxPossibleSpend} HTG, ce qui dépasse le budget total de ${dto.totalBudget} HTG. ` +
          `Augmentez le budget total, réduisez le budget quotidien, ou raccourcissez la durée.`,
        );
      }
    }

    // Garde-fou multi-campagnes : protège contre le sur-engagement du wallet.
    // Toutes les campagnes actives/en attente du vendeur tirent quotidiennement
    // sur le même wallet — on vérifie donc la somme de tous les engagements
    // quotidiens (existants + celui-ci) contre le solde actuel, quel que soit
    // le moyen de paiement choisi pour CETTE campagne (les autres campagnes
    // continueront de tirer sur le wallet chaque jour).
    const otherCampaigns = await this.prisma.adCampaign.findMany({
      where: { sellerId, status: { in: ['ACTIVE', 'PENDING_PAYMENT', 'PENDING_REVIEW'] } },
      select: { totalBudget: true, dailyBudget: true, startDate: true, endDate: true },
    });
    const dailyRateOf = (c: { totalBudget: any; dailyBudget: any; startDate: Date; endDate: Date }) => {
      if (c.dailyBudget) return Number(c.dailyBudget);
      const d = Math.max(1, Math.ceil((c.endDate.getTime() - c.startDate.getTime()) / 86_400_000));
      return Number(c.totalBudget) / d;
    };
    const otherDailyTotal = otherCampaigns.reduce((sum, c) => sum + dailyRateOf(c), 0);
    const thisDays = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / 86_400_000));
    const thisDailyRate = dto.dailyBudget ? Number(dto.dailyBudget) : Number(dto.totalBudget) / thisDays;
    const totalDailyCommitment = otherDailyTotal + thisDailyRate;

    const walletBalance = await this.walletService.getBalance(sellerId);
    if (totalDailyCommitment > walletBalance) {
      throw new BadRequestException(
        `Votre engagement quotidien total (${totalDailyCommitment.toFixed(2)} HTG/jour sur toutes vos campagnes actives) dépasserait votre solde Wallet (${walletBalance} HTG). ` +
        `Rechargez votre wallet ou réduisez le budget quotidien de cette campagne.`,
      );
    }

    return (this.prisma.adCampaign as any).create({
      data: {
        sellerId,
        productId: dto.productId ?? null,
        storeId: dto.storeId ?? null,
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
      include: { product: { include: { images: { where: { isPrimary: true }, take: 1 } } }, store: { select: { id: true, name: true, logoUrl: true, slug: true } } },
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
          store: { select: { id: true, name: true, logoUrl: true, slug: true } },
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
      include: { product: { include: { images: { where: { isPrimary: true }, take: 1 } } }, store: { select: { id: true, name: true, logoUrl: true, slug: true } } },
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

  async publishCampaign(sellerId: string, campaignId: string, publishAt: string) {
    const c = await this.prisma.adCampaign.findFirst({ where: { id: campaignId, sellerId } });
    if (!c) throw new NotFoundException('Campagne introuvable');
    if (c.status !== 'ACTIVE') throw new BadRequestException('Seules les campagnes actives (approuvées et payées) peuvent être publiées');
    if (c.publishedAt) throw new BadRequestException('Cette campagne a déjà été publiée');

    const when = new Date(publishAt);
    if (isNaN(when.getTime())) throw new BadRequestException('Date de publication invalide');
    const now = new Date();
    if (when < now) throw new BadRequestException('L\'heure de publication ne peut pas être dans le passé');

    const updated = await this.prisma.adCampaign.update({ where: { id: campaignId }, data: { publishedAt: when } });

    // Si la publication est immédiate (ou déjà passée au moment de l'appel), on
    // applique le boost tout de suite plutôt que d'attendre jusqu'à 1h le prochain
    // passage du cron — meilleure expérience pour un vendeur qui publie "maintenant".
    if (when <= now) {
      if (c.productId) {
        await this.prisma.product.update({ where: { id: c.productId }, data: { adBoostedUntil: c.endDate } });
      }
      if (c.storeId) {
        await this.prisma.store.update({ where: { id: c.storeId }, data: { adBoostedUntil: c.endDate } });
      }
    }

    return updated;
  }

  async cancelCampaign(campaignId: string, sellerId: string) {
    const c = await this.prisma.adCampaign.findFirst({ where: { id: campaignId, sellerId } });
    if (!c) throw new NotFoundException('Campagne introuvable');
    if (['COMPLETED', 'CANCELLED'].includes(c.status)) throw new BadRequestException('Impossible d\'annuler cette campagne');

    // Remboursement du budget non consommé — uniquement pour les campagnes payées
    // par Wallet (paymentId absent : seul le paiement MonCash renseigne ce champ,
    // cf. payCampaign ci-dessous). Un paiement MonCash a été réglé en externe, pas
    // depuis le solde Wallet, donc rien à recréditer ici pour ce cas.
    const remaining = Number(c.totalBudget) - Number(c.spent);
    if (!c.paymentId && remaining > 0 && (c.status === 'PENDING_REVIEW' || c.status === 'ACTIVE' || c.status === 'PAUSED')) {
      await this.walletService.refundToWallet(
        sellerId, remaining,
        `Remboursement — campagne "${c.name}" annulée (budget non utilisé)`,
        campaignId,
      );
    }

    return this.prisma.adCampaign.update({ where: { id: campaignId }, data: { status: 'CANCELLED' } });
  }

  async payCampaign(campaignId: string, sellerId: string, method: 'WALLET' | 'MONCASH', reference?: string) {
    const campaign = await this.prisma.adCampaign.findFirst({ where: { id: campaignId, sellerId } });
    if (!campaign) throw new NotFoundException('Campagne introuvable');
    if (campaign.status !== 'PENDING_PAYMENT') throw new BadRequestException('Cette campagne n\'attend pas de paiement');

    if (method === 'WALLET') {
      await this.walletService.deductForCampaign(sellerId, campaignId, campaign.totalBudget);
      return this.prisma.adCampaign.update({
        where: { id: campaignId },
        data: { status: 'PENDING_REVIEW' },
      });
    } else {
      if (!reference?.trim()) throw new BadRequestException('Référence MonCash requise');

      // Vérification serveur obligatoire — jamais de confiance dans une simple référence fournie par le client
      let payment: any;
      try {
        payment = await this.moncash.verifyByTransactionId(reference.trim());
      } catch {
        throw new BadRequestException('Transaction MonCash introuvable ou invalide');
      }
      if (payment?.message !== 'successful') {
        throw new BadRequestException('Paiement MonCash non confirmé');
      }
      if (Number(payment.cost) < Number(campaign.totalBudget)) {
        throw new BadRequestException('Montant payé insuffisant pour le budget de la campagne');
      }

      try {
        const paymentRecord = await this.prisma.payment.create({
          data: {
            method: 'MONCASH',
            status: 'COMPLETED',
            amountHTG: campaign.totalBudget,
            moncashTransactionId: reference.trim(),
            paidAt: new Date(),
          },
        });
        return this.prisma.adCampaign.update({
          where: { id: campaignId },
          data: { status: 'PENDING_REVIEW', paymentId: paymentRecord.id },
        });
      } catch (err: any) {
        // Contrainte unique sur moncashTransactionId — empêche la réutilisation d'une même référence
        if (err?.code === 'P2002') throw new ConflictException('Cette référence de paiement a déjà été utilisée');
        throw err;
      }
    }
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
          seller: { include: { user: { select: { firstName: true, lastName: true, email: true } }, stores: { select: { name: true }, take: 1 } } },
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
      .filter(c => c.product && (c.product as any).status === 'PUBLISHED' && (c.product as any).stock > 0)
      .map(c => {
        let score = 100;
        const remaining = Number(c.totalBudget) - Number(c.spent);
        if (remaining <= 0) return null;  // budget exhausted

        // Boost by remaining budget (higher budget = more visibility)
        score += Math.min(remaining / 100, 50);

        // Geo match — targetDepts peut être un JSON string ou un tableau
        const depts: string[] = Array.isArray(c.targetDepts)
          ? c.targetDepts as string[]
          : (() => { try { return JSON.parse(c.targetDepts as any) } catch { return [] } })();
        if (depts.length > 0) {
          if (department && depts.some((d: string) => d.toLowerCase() === department.toLowerCase())) {
            score += 40;
          } else if (department) {
            score -= 30;
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

    const settings = await this.getSettings();
    const cost = type === 'IMPRESSION' ? settings.cpmRateHTG / 1000 : type === 'CLICK' ? settings.cpcRateHTG : CPA;

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
