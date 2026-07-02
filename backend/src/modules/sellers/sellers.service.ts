import { Injectable, NotFoundException, ForbiddenException, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UploadService } from '../upload/upload.service';

@Injectable()
export class SellersService {
  constructor(
    private prisma: PrismaService,
    private uploadService: UploadService,
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

    const [updatedUser] = await this.prisma.$transaction([
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

    return { user: updatedUser };
  }

  // ── Admin: list sellers ───────────────────────────────────────────────────

  async findAll(status?: string, page = 1, limit = 20, search?: string) {
    const where: any = {};
    if (status) where.status = status;
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
        documents: true,
        adCampaigns: { select: { id: true, name: true, status: true, totalBudget: true, createdAt: true }, take: 5 },
      },
    });
    if (!seller) throw new NotFoundException('Vendeur introuvable');
    return seller;
  }

  // ── Admin: approve / reject / suspend ────────────────────────────────────

  async approve(id: string, adminId: string) {
    const s = await this.prisma.seller.findUnique({ where: { id } });
    if (!s) throw new NotFoundException();
    const updated = await this.prisma.seller.update({
      where: { id },
      data: { status: 'APPROVED', approvedBy: adminId, approvedAt: new Date() },
    });
    // Marque la boutique principale comme vérifiée si au moins 1 document valide
    await this._syncStoreVerification(id);
    return updated;
  }

  async reject(id: string, reason: string) {
    return this.prisma.seller.update({ where: { id }, data: { status: 'REJECTED', rejectionReason: reason } });
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
        documents:     true,
      },
    });
  }

  // ── Document management ───────────────────────────────────────────────────

  async getMyDocuments(userId: string) {
    const seller = await this.prisma.seller.findUnique({ where: { userId } });
    if (!seller) throw new NotFoundException('Vendeur introuvable');
    return this.prisma.businessDocument.findMany({
      where: { sellerId: seller.id },
      orderBy: { createdAt: 'desc' },
    });
  }

  async uploadDocument(userId: string, file: Express.Multer.File, type: string, isPublic = false) {
    const seller = await this.prisma.seller.findUnique({ where: { userId } });
    if (!seller) throw new NotFoundException('Vendeur introuvable');

    const result = await this.uploadService.uploadDocument(file, 'seller-documents');

    return this.prisma.businessDocument.create({
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

  async deleteDocument(userId: string, docId: string) {
    const seller = await this.prisma.seller.findUnique({ where: { userId } });
    if (!seller) throw new NotFoundException('Vendeur introuvable');
    const doc = await this.prisma.businessDocument.findUnique({ where: { id: docId } });
    if (!doc || doc.sellerId !== seller.id) throw new ForbiddenException('Document introuvable');
    // Delete the file from R2 (documents folder, single file — not 3-size variant)
    try { await this.uploadService.deleteImage(doc.publicId, 'seller-documents'); } catch { /* ignore if already gone */ }
    return this.prisma.businessDocument.delete({ where: { id: docId } });
  }

  async adminValidateDocument(sellerId: string, docId: string, isValid: boolean) {
    const doc = await this.prisma.businessDocument.findUnique({ where: { id: docId } });
    if (!doc || doc.sellerId !== sellerId) throw new NotFoundException('Document introuvable');
    const result = await this.prisma.businessDocument.update({ where: { id: docId }, data: { isValid } });
    // Re-évaluer la vérification de la boutique après chaque validation doc
    await this._syncStoreVerification(sellerId);
    return result;
  }

  // ── Badge logic ───────────────────────────────────────────────────────────
  // isVerified = true  si vendeur APPROVED + au moins 1 document isValid=true
  // isVerified = false si vendeur suspendu/rejeté ou aucun document validé
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
    const shouldVerify = seller.status === 'APPROVED' && seller.documents.length > 0;
    await this.prisma.store.update({
      where: { id: seller.stores[0].id },
      data:  { isVerified: shouldVerify },
    });
  }

  // ── Profile update ────────────────────────────────────────────────────────

  async updateProfile(userId: string, data: { businessType?: string; businessCity?: string; businessDept?: string; businessAddress?: string }) {
    const seller = await this.prisma.seller.findUnique({ where: { userId } });
    if (!seller) throw new NotFoundException('Vendeur introuvable');
    return this.prisma.seller.update({ where: { userId }, data });
  }

  // ── Public: featured sellers (ELITE > BUSINESS > STARTER, verified first) ─
  async getFeatured(limit = 20, department?: string) {
    const tierOrder: Record<string, number> = { ELITE: 0, BUSINESS: 1, STARTER: 2, FREE: 3 };

    const sellers: any[] = await (this.prisma.seller as any).findMany({
      where: {
        status: 'APPROVED',
        subscriptions: {
          some: {
            isActive: true,
            endDate: { gt: new Date() },
            plan: { tier: { in: ['ELITE', 'BUSINESS', 'STARTER'] } },
          },
        },
      },
      include: {
        user:  { select: { firstName: true, lastName: true, avatar: true, city: true, department: true } },
        stores: {
          where:   { isActive: true, isPrimary: true },
          select:  { id: true, name: true, slug: true, logoUrl: true,
                     isVerified: true, avgRating: true, totalReviews: true,
                     city: true, department: true, _count: { select: { products: true } } },
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

    return sellers
      .filter((s: any) => s.stores?.length > 0)
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
        const aVer = a.stores?.[0]?.isVerified ? 0 : 1;
        const bVer = b.stores?.[0]?.isVerified ? 0 : 1;
        if (aVer !== bVer) return aVer - bVer;
        return (b.stores?.[0]?.avgRating || 0) - (a.stores?.[0]?.avgRating || 0);
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
          isVerified:   s.stores[0].isVerified,
          avgRating:    s.stores[0].avgRating,
          totalReviews: s.stores[0].totalReviews,
          city:         s.stores[0].city,
          department:   s.stores[0].department,
          productCount: s.stores[0]._count?.products ?? 0,
        },
      }));
  }
}
