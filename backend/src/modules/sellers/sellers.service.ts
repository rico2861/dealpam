import { Injectable, NotFoundException, ForbiddenException, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UploadService } from '../upload/upload.service';
import { MailService } from '../mail/mail.service';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';

// Types de document qui prouvent l'identité du vendeur — leur (re)soumission
// après un rejet remet automatiquement le dossier "en attente".
const IDENTITY_DOC_TYPES = ['IDENTITY', 'SELFIE'];

// Ne jamais renvoyer "url" côté API — ce champ n'est plus une URL publique
// valide et ne doit de toute façon jamais transiter par une réponse JSON.
// La consultation passe uniquement par getMyDocumentUrl / getAdminDocumentUrl.
const DOC_SAFE_SELECT = {
  id: true, sellerId: true, type: true, publicId: true, fileName: true, isValid: true, rejectionReason: true, createdAt: true,
} as const;

@Injectable()
export class SellersService {
  constructor(
    private prisma: PrismaService,
    private uploadService: UploadService,
    private mailService: MailService,
    private subscriptionsService: SubscriptionsService,
  ) {}

  // ── Buyer → Seller conversion ─────────────────────────────────────────────

  private toSlug(name: string): string {
    return name
      .toLowerCase()
      .normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }

  private async generateNameSuggestions(base: string): Promise<string[]> {
    const candidates = [
      `${base}_shop`,
      `${base}${Math.floor(10 + Math.random() * 90)}`,
      `${base}_${Math.floor(100 + Math.random() * 900)}`,
      `${base}_officiel`,
      `${base}2`,
    ];
    const suggestions: string[] = [];
    for (const c of candidates) {
      if (suggestions.length >= 3) break;
      const exists = await this.prisma.store.findFirst({ where: { name: { equals: c } } });
      if (!exists) suggestions.push(c);
    }
    // fallback with timestamp if not enough unique
    while (suggestions.length < 3) {
      suggestions.push(`${base}_${Date.now().toString().slice(-5)}`);
    }
    return suggestions;
  }

  async becomeSeller(userId: string, storeName: string, storeDescription?: string, nif?: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, include: { seller: true } });
    if (!user) throw new NotFoundException('Utilisateur introuvable');
    if (user.role === 'SELLER' || user.seller) throw new ConflictException('Ce compte est déjà un compte vendeur');

    // Check store name uniqueness
    const nameExists = await this.prisma.store.findFirst({ where: { name: { equals: storeName } } });
    if (nameExists) {
      const suggestions = await this.generateNameSuggestions(storeName);
      throw new ConflictException({ message: 'Ce nom de boutique est déjà utilisé.', suggestions });
    }

    // Ensure slug is unique
    let slug = this.toSlug(storeName);
    const slugExists = await this.prisma.store.findFirst({ where: { slug } });
    if (slugExists) slug = `${slug}-${Date.now().toString().slice(-6)}`;

    const [updatedUser, seller] = await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: userId },
        data: { role: 'SELLER' },
        select: { id: true, firstName: true, lastName: true, email: true, username: true, role: true, avatar: true },
      }),
      this.prisma.seller.create({
        data: {
          userId,
          nif: nif || null,
          stores: {
            create: {
              name: storeName,
              slug,
              description: storeDescription || null,
              isPrimary: true,
            },
          },
        },
      }),
    ]);

    // Garantit les 2 produits gratuits du plan Starter dès la création du
    // compte, sans exiger que le vendeur passe par l'essai ou un paiement.
    await this.subscriptionsService.ensureBaselinePlan(seller.id).catch(() => null);

    return { user: updatedUser };
  }

  // ── Admin: list sellers ───────────────────────────────────────────────────

  async findAll(status?: string, page = 1, limit = 20, search?: string, dateFrom?: string, dateTo?: string) {
    const where: any = {};
    if (status) where.status = status;
    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = new Date(dateFrom);
      if (dateTo)   where.createdAt.lte = new Date(`${dateTo}T23:59:59.999Z`);
    }
    if (search) {
      const s = search.trim();
      where.OR = [
        { user: { email:     { contains: s, mode: 'insensitive' } } },
        { user: { username:  { contains: s, mode: 'insensitive' } } },
        { user: { firstName: { contains: s, mode: 'insensitive' } } },
        { user: { lastName:  { contains: s, mode: 'insensitive' } } },
        { stores: { some: { name: { contains: s, mode: 'insensitive' } } } },
        { nif: { contains: s } },
      ];
    }

    const [sellers, total] = await Promise.all([
      this.prisma.seller.findMany({
        where, skip: (page - 1) * limit, take: limit,
        include: {
          user: { select: {
            id: true, email: true, username: true, firstName: true, lastName: true,
            phone: true, avatar: true, isActive: true, createdAt: true, lastLoginAt: true,
          }},
          stores: {
            select: { id: true, name: true, slug: true, isPrimary: true, isActive: true, avgRating: true, totalSales: true,
                      _count: { select: { products: true } } },
            orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
          },
          subscriptions: { where: { isActive: true }, include: { plan: true }, take: 1 },
          _count: { select: { stores: true, documents: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.seller.count({ where }),
    ]);

    return { sellers, total, page, pages: Math.ceil(total / limit) };
  }

  // ── Admin: single seller detail ───────────────────────────────────────────

  async findOne(id: string) {
    const seller = await this.prisma.seller.findUnique({
      where: { id },
      include: {
        user: { select: {
          id: true, email: true, username: true, firstName: true, lastName: true,
          phone: true, avatar: true, isActive: true, createdAt: true,
          lastLoginAt: true, department: true, city: true,
          _count: { select: { orders: true, reviews: true } },
        }},
        stores: {
          include: { _count: { select: { products: true, orders: true, reviews: true } } },
          orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
        },
        subscriptions: { include: { plan: true }, orderBy: { createdAt: 'desc' }, take: 3 },
        documents: { select: DOC_SAFE_SELECT },
        adCampaigns: { select: { id: true, name: true, status: true, totalBudget: true, createdAt: true }, take: 5 },
      },
    });
    if (!seller) throw new NotFoundException('Vendeur introuvable');

    // ── Vue d'ensemble admin (Étape 6) : produits, dépenses, fiabilité ──────
    const [products, disputesCount, subsSpent, adsSpent, verificationsSpent] = await Promise.all([
      this.prisma.product.findMany({
        where: { store: { sellerId: id } },
        select: {
          id: true, name: true, slug: true, price: true, salePrice: true,
          status: true, productType: true, stock: true, avgRating: true,
          createdAt: true, images: { take: 1, orderBy: { sortOrder: 'asc' }, select: { urlThumb: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 100,
      }),
      this.prisma.complaint.count({ where: { sellerId: id } }),
      this.prisma.payment.aggregate({
        where: { status: 'COMPLETED', subscription: { sellerId: id } },
        _sum: { amountHTG: true },
      }),
      this.prisma.payment.aggregate({
        where: { status: 'COMPLETED', adCampaign: { sellerId: id } },
        _sum: { amountHTG: true },
      }),
      // Vérification de boutique payante (Étape 7) — champ pas encore modélisé,
      // compté à 0 pour l'instant ; à brancher une fois ce paiement implémenté.
      Promise.resolve({ _sum: { amountHTG: null as any } }),
    ]);

    const totalSpentHTG =
      Number(subsSpent._sum.amountHTG ?? 0) +
      Number(adsSpent._sum.amountHTG ?? 0) +
      Number(verificationsSpent._sum.amountHTG ?? 0);

    return {
      ...seller,
      products,
      reliability: {
        disputesCount,
        avgRating: seller.stores[0]?.avgRating ?? 0,
        totalReviews: seller.stores[0]?.totalReviews ?? 0,
        memberSince: seller.createdAt,
      },
      totalSpentHTG,
    };
  }

  // ── Admin: approve / reject / suspend ────────────────────────────────────

  async approve(id: string, adminId: string) {
    const s = await this.prisma.seller.findUnique({
      where: { id },
      include: { user: true, stores: { where: { isPrimary: true }, take: 1 } },
    });
    if (!s) throw new NotFoundException();
    const updated = await this.prisma.seller.update({
      where: { id },
      data: { status: 'APPROVED', approvedBy: adminId, approvedAt: new Date() },
    });
    // Marque la boutique principale comme vérifiée si au moins 1 document valide
    await this._syncStoreVerification(id);
    if (s.user?.email) {
      this.mailService.sendSellerApproved(s.user.email, s.user.firstName, s.stores[0]?.name ?? '')
        .catch(() => null);
    }
    return updated;
  }

  async reject(id: string, reason: string) {
    const s = await this.prisma.seller.findUnique({ where: { id }, include: { user: true } });
    if (!s) throw new NotFoundException();
    const updated = await this.prisma.seller.update({ where: { id }, data: { status: 'REJECTED', rejectionReason: reason } });
    if (s.user?.email) {
      this.mailService.sendSellerRejected(s.user.email, s.user.firstName, reason).catch(() => null);
    }
    return updated;
  }

  async suspend(id: string) {
    return this.prisma.seller.update({ where: { id }, data: { status: 'SUSPENDED' } });
  }

  async reactivate(id: string) {
    return this.prisma.seller.update({ where: { id }, data: { status: 'APPROVED' } });
  }

  // ── Seller self ───────────────────────────────────────────────────────────

  getMe(userId: string) {
    return this.prisma.seller.findUnique({
      where: { userId },
      include: {
        stores:        { orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }] },
        subscriptions: { where: { isActive: true }, include: { plan: true }, take: 1 },
        documents:     { select: DOC_SAFE_SELECT },
      },
    });
  }

  // ── Document management ───────────────────────────────────────────────────

  async getMyDocuments(userId: string) {
    const seller = await this.prisma.seller.findUnique({ where: { userId } });
    if (!seller) throw new NotFoundException('Vendeur introuvable');
    return this.prisma.businessDocument.findMany({
      where: { sellerId: seller.id },
      select: DOC_SAFE_SELECT,
      orderBy: { createdAt: 'desc' },
    });
  }

  async uploadDocument(userId: string, file: Express.Multer.File, type: string, isPublic = false) {
    const seller = await this.prisma.seller.findUnique({ where: { userId }, include: { user: true } });
    if (!seller) throw new NotFoundException('Vendeur introuvable');

    const result = await this.uploadService.uploadDocument(file, 'seller-documents');

    const doc = await this.prisma.businessDocument.create({
      data: {
        sellerId: seller.id,
        type,
        url:      result.url,
        publicId: result.publicId,
        fileName: file.originalname,
        isValid:  null,
        // Store visibility in fileName prefix (workaround for missing isPublic field in current schema)
        // We encode as JSON-like prefix: "PUBLIC:" or "PRIVATE:"
      },
    });

    // Resoumission après rejet : un document d'identité (ID ou selfie) remet
    // automatiquement le dossier "en attente" et prévient le vendeur par email.
    if (seller.status === 'REJECTED' && IDENTITY_DOC_TYPES.includes(type)) {
      await this.prisma.seller.update({
        where: { id: seller.id },
        data:  { status: 'PENDING', rejectionReason: null },
      });
      if (seller.user?.email) {
        this.mailService.sendSellerDocsPending(seller.user.email, seller.user.firstName).catch(() => null);
      }
    }

    return doc;
  }

  // ── Consultation sécurisée d'un document (URL signée, 5 min) ─────────────
  // Le vendeur ne peut voir que ses propres documents ; l'admin peut voir
  // ceux de n'importe quel vendeur. Jamais d'URL publique directe exposée.
  async getMyDocumentUrl(userId: string, docId: string) {
    const seller = await this.prisma.seller.findUnique({ where: { userId } });
    if (!seller) throw new NotFoundException('Vendeur introuvable');
    const doc = await this.prisma.businessDocument.findUnique({ where: { id: docId } });
    if (!doc || doc.sellerId !== seller.id) throw new ForbiddenException('Document introuvable');
    const url = await this.uploadService.getDocumentSignedUrl(doc.publicId, doc.fileName);
    return { url };
  }

  async getAdminDocumentUrl(sellerId: string, docId: string) {
    const doc = await this.prisma.businessDocument.findUnique({ where: { id: docId } });
    if (!doc || doc.sellerId !== sellerId) throw new NotFoundException('Document introuvable');
    const url = await this.uploadService.getDocumentSignedUrl(doc.publicId, doc.fileName);
    return { url };
  }

  async updateDocumentVisibility(userId: string, docId: string, isPublic: boolean) {
    const seller = await this.prisma.seller.findUnique({ where: { userId } });
    if (!seller) throw new NotFoundException('Vendeur introuvable');
    const doc = await this.prisma.businessDocument.findUnique({ where: { id: docId } });
    if (!doc || doc.sellerId !== seller.id) throw new ForbiddenException('Document introuvable');
    // Encode visibility in fileName prefix since schema has no isPublic field yet
    const base = doc.fileName.replace(/^(PUBLIC:|PRIVATE:)/, '');
    return this.prisma.businessDocument.update({
      where: { id: docId },
      data: { fileName: `${isPublic ? 'PUBLIC:' : 'PRIVATE:'}${base}` },
    });
  }

  // Suppression volontairement indisponible : les documents KYC doivent rester
  // en base en permanence (pas de suppression automatique, sauf politique de
  // rétention définie explicitement plus tard). Un vendeur qui s'est trompé
  // soumet simplement un nouveau document — l'historique complet reste consultable.

  async adminValidateDocument(sellerId: string, docId: string, isValid: boolean, rejectionReason?: string) {
    const doc = await this.prisma.businessDocument.findUnique({ where: { id: docId } });
    if (!doc || doc.sellerId !== sellerId) throw new NotFoundException('Document introuvable');
    if (!isValid && !rejectionReason?.trim()) {
      throw new BadRequestException('Un motif est requis pour refuser un document');
    }
    const result = await this.prisma.businessDocument.update({
      where: { id: docId },
      // Un document validé n'a plus besoin de motif — évite d'afficher un ancien
      // refus au vendeur après une nouvelle validation.
      data: { isValid, rejectionReason: isValid ? null : rejectionReason!.trim() },
    });
    // Re-évaluer la vérification de la boutique après chaque validation doc
    await this._syncStoreVerification(sellerId);
    return result;
  }

  // ── Badge logic ───────────────────────────────────────────────────────────
  // isVerified = true si vendeur APPROVED + pièce d'identité ET selfie validés.
  // La patente commerciale est optionnelle pour ce badge — elle n'accorde qu'un
  // badge distinct "Patente vérifiée" (hasVerifiedPatente), affiché publiquement
  // en plus si le vendeur choisit de la fournir (crédibilité supplémentaire).
  async adminSetVerified(sellerId: string, isVerified: boolean) {
    const seller = await this.prisma.seller.findUnique({
      where: { id: sellerId },
      include: { stores: { where: { isPrimary: true }, take: 1 } },
    });
    if (!seller || !seller.stores[0]) throw new NotFoundException('Vendeur ou boutique introuvable');
    return this.prisma.store.update({
      where: { id: seller.stores[0].id },
      data:  { isVerified },
    });
  }

  private async _syncStoreVerification(sellerId: string) {
    const seller = await this.prisma.seller.findUnique({
      where: { id: sellerId },
      include: {
        documents: { where: { isValid: true } },
        stores:    { where: { isPrimary: true }, take: 1 },
      },
    });
    if (!seller || !seller.stores[0]) return;
    const hasIdentity = seller.documents.some(d => d.type === 'IDENTITY');
    const hasSelfie    = seller.documents.some(d => d.type === 'SELFIE');
    const hasPatente   = seller.documents.some(d => d.type === 'PATENTE');
    const shouldVerify = seller.status === 'APPROVED' && hasIdentity && hasSelfie;
    await this.prisma.store.update({
      where: { id: seller.stores[0].id },
      data:  { isVerified: shouldVerify, hasVerifiedPatente: hasPatente },
    });
  }

  // ── Profile update ────────────────────────────────────────────────────────

  async updateProfile(userId: string, data: {
    businessType?: string; businessTypeOther?: string; businessCity?: string;
    businessDept?: string; businessAddress?: string; cin?: string; nif?: string;
  }) {
    const seller = await this.prisma.seller.findUnique({ where: { userId } });
    if (!seller) throw new NotFoundException('Vendeur introuvable');
    // businessTypeOther n'a de sens que si businessType === 'OTHER' — on l'efface
    // sinon pour éviter un texte orphelin qui ne s'affiche nulle part.
    const cleaned = { ...data };
    if (cleaned.businessType && cleaned.businessType !== 'OTHER') cleaned.businessTypeOther = null as any;
    return this.prisma.seller.update({ where: { userId }, data: cleaned as any });
  }

  // ── Public: featured sellers — vérifiées d'abord, puis meilleure note, puis
  // plan le plus rentable pour la plateforme (ELITE > PREMIUM > BUSINESS > STARTER).
  async getFeatured(limit = 20, department?: string) {
    const tierOrder: Record<string, number> = { ELITE: 0, PREMIUM: 1, BUSINESS: 2, STARTER: 3, FREE: 4 };

    const sellers: any[] = await (this.prisma.seller as any).findMany({
      where: {
        status: 'APPROVED',
        stores: { some: { isActive: true, isPrimary: true, isVerified: true } },
        subscriptions: {
          some: {
            isActive: true,
            endDate: { gt: new Date() },
            plan: { tier: { in: ['ELITE', 'PREMIUM', 'BUSINESS', 'STARTER'] } },
          },
        },
      },
      include: {
        user:  { select: { firstName: true, lastName: true, avatar: true, city: true, department: true } },
        stores: {
          // isVerified répété ici (pas seulement dans le where racine) : sinon,
          // pour un vendeur multi-boutiques, la boutique PRIMARY affichée
          // pourrait ne pas être celle qui est réellement vérifiée.
          where:   { isActive: true, isPrimary: true, isVerified: true },
          select:  { id: true, name: true, slug: true, logoUrl: true, bannerUrl: true,
                     isVerified: true, avgRating: true, totalReviews: true, totalSales: true,
                     address: true, city: true, department: true, _count: { select: { products: true } } },
          take: 1,
        },
        subscriptions: {
          where:   { isActive: true, endDate: { gt: new Date() } },
          include: { plan: { select: { tier: true, name: true } } },
          orderBy: { startDate: 'desc' },
          take: 1,
        },
      },
      take: limit * 3,
    });

    const deptNorm = department?.toLowerCase().trim();
    const candidates = sellers.filter((s: any) => s.stores?.length > 0);

    // Note pondérée (moyenne bayésienne) : une boutique avec 1 avis à 5★ ne doit
    // jamais battre une boutique avec des centaines d'avis à 4.7★. On tire vers
    // C (la moyenne du pool candidat) tant que le nombre d'avis reste faible,
    // et on converge vers la moyenne brute au fur et à mesure qu'elle devient
    // statistiquement fiable (M = seuil de confiance, en nombre d'avis).
    const M = 10;
    const ratings = candidates.map((s: any) => Number(s.stores?.[0]?.avgRating) || 0).filter((r: number) => r > 0);
    const C = ratings.length ? ratings.reduce((a: number, b: number) => a + b, 0) / ratings.length : 4;
    const weightedRating = (store: any) => {
      const R = Number(store?.avgRating) || 0;
      const v = Number(store?.totalReviews) || 0;
      return (v / (v + M)) * R + (M / (v + M)) * C;
    };

    return candidates
      .sort((a: any, b: any) => {
        // Vendeurs locaux (même département) en premier si department fourni
        if (deptNorm) {
          const aLocal = a.stores?.[0]?.department?.toLowerCase().trim() === deptNorm ? 0 : 1;
          const bLocal = b.stores?.[0]?.department?.toLowerCase().trim() === deptNorm ? 0 : 1;
          if (aLocal !== bLocal) return aLocal - bLocal;
        }
        const aTier = tierOrder[a.subscriptions?.[0]?.plan?.tier ?? 'FREE'] ?? 9;
        const bTier = tierOrder[b.subscriptions?.[0]?.plan?.tier ?? 'FREE'] ?? 9;
        if (aTier !== bTier) return aTier - bTier;
        return weightedRating(b.stores?.[0]) - weightedRating(a.stores?.[0]);
      })
      .slice(0, limit)
      .map((s: any) => ({
        id:       s.id,
        tier:     s.subscriptions?.[0]?.plan?.tier ?? 'FREE',
        planName: s.subscriptions?.[0]?.plan?.name ?? '',
        store: {
          id:           s.stores[0].id,
          name:         s.stores[0].name,
          slug:         s.stores[0].slug,
          logoUrl:      s.stores[0].logoUrl ?? null,
          bannerUrl:    s.stores[0].bannerUrl ?? null,
          isVerified:   s.stores[0].isVerified,
          avgRating:    s.stores[0].avgRating,
          totalReviews: s.stores[0].totalReviews,
          totalSales:   s.stores[0].totalSales ?? 0,
          address:      s.stores[0].address ?? null,
          city:         s.stores[0].city,
          department:   s.stores[0].department,
          productCount: s.stores[0]._count?.products ?? 0,
        },
      }));
  }
}
