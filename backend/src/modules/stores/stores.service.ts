import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

// Default plan limits (fallback if SubscriptionPlan.maxStores not set)
const DEFAULT_MAX_STORES: Record<string, number> = {
  STARTER:  1,
  BUSINESS: 3,
  PREMIUM:  5,
  ELITE:    10,
};

@Injectable()
export class StoresService {
  constructor(private prisma: PrismaService) {}

  // ── Public ────────────────────────────────────────────────────────────────

  async findAll(page = 1, limit = 20) {
    // Priorité aux boutiques actuellement boostées par une campagne pub "boutique"
    // active (adBoostedUntil > now). Un adBoostedUntil expiré (dans le passé) ne
    // doit plus compter — d'où le filtre explicite plutôt qu'un simple orderBy
    // desc sur ce champ nullable (qui classerait un boost expiré avant une
    // boutique jamais boostée).
    const now = new Date();
    const include = {
      seller: { include: { subscriptions: { where: { isActive: true }, include: { plan: true }, take: 1 } } },
      _count: { select: { products: true } },
    };
    const skip = (page - 1) * limit;

    const boostedPool = await this.prisma.store.findMany({
      where:   { isActive: true, adBoostedUntil: { gt: now } },
      include,
      orderBy: { adBoostedUntil: 'desc' },
      take:    500, // pool borné — limitation acceptée pour les pages très profondes
    });

    if (skip < boostedPool.length) {
      const boostedSlice = boostedPool.slice(skip, skip + limit);
      if (boostedSlice.length === limit) return boostedSlice;
      const rest = await this.prisma.store.findMany({
        where: { isActive: true, OR: [{ adBoostedUntil: null }, { adBoostedUntil: { lte: now } }] },
        include,
        take: limit - boostedSlice.length,
      });
      return [...boostedSlice, ...rest];
    }

    return this.prisma.store.findMany({
      where: { isActive: true, OR: [{ adBoostedUntil: null }, { adBoostedUntil: { lte: now } }] },
      include,
      skip: skip - boostedPool.length, take: limit,
    });
  }

  async findBySlug(slug: string) {
    const store = await this.prisma.store.findUnique({
      where:   { slug },
      include: {
        seller: {
          include: {
            stores: {
              where:   { isActive: true },
              include: { _count: { select: { products: true } } },
              orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
            },
            subscriptions: { where: { isActive: true }, include: { plan: true }, take: 1 },
            _count: { select: { stores: true } },
          },
        },
        reviews: {
          orderBy: { createdAt: 'desc' },
          take:    10,
          include: { user: { select: { id: true, firstName: true, lastName: true, avatar: true } } },
        },
        _count: { select: { products: true, reviews: true } },
      },
    });
    if (!store) throw new NotFoundException('Boutique introuvable');
    return store;
  }

  // ── Seller: get own stores ────────────────────────────────────────────────

  async getMyStores(userId: string) {
    const seller = await this.prisma.seller.findUnique({
      where:   { userId },
      include: {
        stores:        { orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }], include: { _count: { select: { products: true } } } },
        subscriptions: { where: { isActive: true }, include: { plan: true }, take: 1 },
      },
    });
    if (!seller) throw new NotFoundException('Vendeur introuvable');

    const plan   = seller.subscriptions[0]?.plan;
    const maxStores = (plan as any)?.maxStores ?? DEFAULT_MAX_STORES[(plan as any)?.tier ?? 'STARTER'] ?? 1;

    // Vues cumulées des produits, par boutique — pour affichage "Vues" sur chaque carte.
    const storesWithViews = await Promise.all(
      (seller.stores as any[]).map(async (store) => {
        const viewsAgg = await this.prisma.product.aggregate({
          where: { storeId: store.id }, _sum: { viewCount: true },
        });
        return { ...store, totalViews: viewsAgg._sum.viewCount || 0 };
      }),
    );

    return {
      stores:    storesWithViews,
      maxStores,
      canCreate: (seller.stores as any[]).length < maxStores,
    };
  }

  // ── Seller: create new store ──────────────────────────────────────────────

  async createStore(userId: string, dto: {
    name:         string;
    description?: string;
    city?:        string;
    department?:  string;
    phone?:       string;
    email?:       string;
    whatsapp?:    string;
  }) {
    const seller = await this.prisma.seller.findUnique({
      where:   { userId },
      include: {
        stores:        true,
        subscriptions: { where: { isActive: true }, include: { plan: true }, take: 1 },
      },
    });
    if (!seller) throw new NotFoundException('Vendeur introuvable');
    if (seller.status !== 'APPROVED') throw new ForbiddenException('Votre compte vendeur doit être approuvé pour créer une boutique');

    const plan      = seller.subscriptions[0]?.plan;
    const maxStores = (plan as any)?.maxStores ?? DEFAULT_MAX_STORES[(plan as any)?.tier ?? 'STARTER'] ?? 1;
    const current   = (seller.stores as any[]).length;

    if (current >= maxStores) {
      throw new ForbiddenException(`Votre plan permet au maximum ${maxStores} boutique(s). Mettez à niveau pour en créer davantage.`);
    }

    const nameTrimmed = dto.name.trim();
    const nameTaken = await (this.prisma.store as any).findFirst({
      where: { name: { equals: nameTrimmed, mode: 'insensitive' } },
    });
    if (nameTaken) {
      throw new ForbiddenException('Ce nom de boutique est déjà utilisé sur la plateforme. Choisissez-en un autre.');
    }

    const slug      = await this.buildUniqueSlug(dto.name);
    const storeCode = await this.generateStoreCode();
    const isPrimary = current === 0;

    return (this.prisma.store as any).create({
      data: {
        sellerId:    seller.id,
        storeCode,
        name:        dto.name.trim(),
        slug,
        description: dto.description?.trim() || null,
        city:        dto.city || null,
        department:  dto.department || null,
        phone:       dto.phone || null,
        email:       dto.email || null,
        whatsapp:    dto.whatsapp || null,
        isPrimary,
      },
    });
  }

  // ── Seller: update a specific store ──────────────────────────────────────

  async updateStore(userId: string, storeId: string, data: {
    name?:                   string;
    description?:            string;
    logoUrl?:                string;
    bannerUrl?:              string;
    phone?:                  string;
    email?:                  string;
    whatsapp?:               string;
    address?:                string;
    city?:                   string;
    department?:             string;
    acceptedPaymentMethods?: string[];
    moncashPhone?:           string;
    pickupPoints?:           string;
    deliveryZones?:          string;
    schedule?:               string;
    currency?:               string;
    exchangeRate?:           number;
  }) {
    const store = await this.prisma.store.findUnique({
      where:   { id: storeId },
      include: { seller: true },
    });
    if (!store)                      throw new NotFoundException('Boutique introuvable');
    if (store.seller.userId !== userId) throw new ForbiddenException('Cette boutique ne vous appartient pas');

    if (data.name && data.name.trim().toLowerCase() !== store.name.toLowerCase()) {
      const nameTaken = await (this.prisma.store as any).findFirst({
        where: { name: { equals: data.name.trim(), mode: 'insensitive' }, id: { not: storeId } },
      });
      if (nameTaken) {
        throw new ForbiddenException('Ce nom de boutique est déjà utilisé sur la plateforme. Choisissez-en un autre.');
      }
    }

    const payload: any = { ...data };
    if (Array.isArray(payload.acceptedPaymentMethods)) {
      payload.acceptedPaymentMethods = JSON.stringify(payload.acceptedPaymentMethods);
    }

    return this.prisma.store.update({ where: { id: storeId }, data: payload });
  }

  /** Backward-compat: update primary store via seller userId */
  async updateMe(userId: string, data: any) {
    const seller = await this.prisma.seller.findUnique({ where: { userId } });
    if (!seller) throw new NotFoundException('Vendeur introuvable');

    const primary = await this.prisma.store.findFirst({
      where: { sellerId: seller.id, isPrimary: true },
    });
    if (!primary) throw new NotFoundException('Boutique principale introuvable');

    return this.updateStore(userId, primary.id, data);
  }

  // ── Seller: delete a non-primary store ───────────────────────────────────

  async deleteStore(userId: string, storeId: string) {
    const store = await this.prisma.store.findUnique({
      where:   { id: storeId },
      include: { seller: true, _count: { select: { products: true } } },
    });
    if (!store)                         throw new NotFoundException('Boutique introuvable');
    if (store.seller.userId !== userId)  throw new ForbiddenException('Cette boutique ne vous appartient pas');
    if (store.isPrimary)                 throw new ForbiddenException('Impossible de supprimer la boutique principale');
    if ((store._count as any).products > 0) throw new BadRequestException('Supprimez ou déplacez les produits avant de supprimer cette boutique');

    return this.prisma.store.delete({ where: { id: storeId } });
  }

  // ── Admin helpers ─────────────────────────────────────────────────────────

  async adminGetStoresBySeller(sellerId: string) {
    return this.prisma.store.findMany({
      where:   { sellerId },
      include: { _count: { select: { products: true, orders: true } } },
      orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
    });
  }

  // ── Internal ──────────────────────────────────────────────────────────────

  private buildSlug(name: string): string {
    return name.toLowerCase().normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '')
      .slice(0, 60);
  }

  private async buildUniqueSlug(name: string): Promise<string> {
    const base = this.buildSlug(name);
    const suffix = Date.now().toString(36);
    const candidate = `${base}-${suffix}`;
    const exists = await this.prisma.store.findUnique({ where: { slug: candidate } });
    if (exists) return `${base}-${suffix}-${Math.random().toString(36).slice(2, 6)}`;
    return candidate;
  }

  private async generateStoreCode(): Promise<string> {
    for (let i = 0; i < 20; i++) {
      const digits = Math.floor(1000 + Math.random() * 9000);
      const code   = `SHOP-${digits}`;
      const exists = await (this.prisma.store as any).findUnique({ where: { storeCode: code } });
      if (!exists) return code;
    }
    // Fallback: SHOP + timestamp base36
    return `SHOP-${Date.now().toString(36).toUpperCase().slice(-4)}`;
  }

  // ── Abonnement client à une boutique ("suivre") ───────────────────────────

  async follow(userId: string, storeId: string) {
    const store = await this.prisma.store.findUnique({ where: { id: storeId }, select: { id: true } });
    if (!store) throw new NotFoundException('Boutique introuvable');

    const existing = await this.prisma.storeFollow.findUnique({
      where: { userId_storeId: { userId, storeId } },
    });
    if (existing) return { following: true };

    await this.prisma.$transaction([
      this.prisma.storeFollow.create({ data: { userId, storeId } }),
      this.prisma.store.update({ where: { id: storeId }, data: { followersCount: { increment: 1 } } }),
    ]);
    return { following: true };
  }

  async unfollow(userId: string, storeId: string) {
    const existing = await this.prisma.storeFollow.findUnique({
      where: { userId_storeId: { userId, storeId } },
    });
    if (!existing) return { following: false };

    await this.prisma.$transaction([
      this.prisma.storeFollow.delete({ where: { id: existing.id } }),
      this.prisma.store.update({ where: { id: storeId }, data: { followersCount: { decrement: 1 } } }),
    ]);
    return { following: false };
  }

  async getFollowStatus(userId: string, storeId: string) {
    const existing = await this.prisma.storeFollow.findUnique({
      where: { userId_storeId: { userId, storeId } },
      select: { id: true },
    });
    return { following: !!existing };
  }

  // Boutiques suivies par le client — pour une éventuelle page "Mes abonnements".
  async getFollowedStores(userId: string) {
    const follows = await this.prisma.storeFollow.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        store: {
          select: { id: true, name: true, slug: true, logoUrl: true, city: true, department: true, avgRating: true, followersCount: true },
        },
      },
    });
    return follows.map(f => f.store);
  }
}
