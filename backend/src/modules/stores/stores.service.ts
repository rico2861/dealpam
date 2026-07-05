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

  findAll(page = 1, limit = 20) {
    return this.prisma.store.findMany({
      where:   { isActive: true },
      include: {
        seller: { include: { subscriptions: { where: { isActive: true }, include: { plan: true }, take: 1 } } },
        _count:  { select: { products: true } },
      },
      skip: (page - 1) * limit, take: limit,
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

    return {
      stores:    seller.stores,
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
}
