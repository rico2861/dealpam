import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

const KEY_ACTIVE = 'flash_sale_active';
const KEY_END_AT = 'flash_sale_end_at';
const KEY_TITLE  = 'flash_sale_title';
const KEY_MODE   = 'flash_sale_mode'; // "manual" | "auto" | "both"

const PRODUCT_SELECT = {
  id: true, name: true, slug: true, price: true, salePrice: true, stock: true,
  isFeatured: true, isSponsored: true, avgRating: true, totalReviews: true, totalSold: true,
  images: { take: 3, orderBy: { sortOrder: 'asc' as any }, select: { urlMedium: true, urlFull: true, urlThumb: true } },
  store: { select: { name: true, slug: true } },
  category: { select: { name: true, slug: true } },
};

@Injectable()
export class FlashSaleService {
  constructor(private prisma: PrismaService) {}

  private async getSetting(key: string): Promise<string | null> {
    const s = await this.prisma.setting.findUnique({ where: { key } });
    return s?.value ?? null;
  }

  private async setSetting(key: string, value: string, group = 'flash_sale') {
    return this.prisma.setting.upsert({
      where: { key },
      update: { value },
      create: { key, value, group, isPublic: true },
    });
  }

  async getConfig() {
    const [active, endAt, title, mode] = await Promise.all([
      this.getSetting(KEY_ACTIVE),
      this.getSetting(KEY_END_AT),
      this.getSetting(KEY_TITLE),
      this.getSetting(KEY_MODE),
    ]);
    return {
      isActive: active === 'true',
      endAt: endAt || null,
      title: title || 'Ventes Flash',
      mode: mode || 'both',
    };
  }

  async updateConfig(dto: { isActive?: boolean; endAt?: string; title?: string; mode?: string }) {
    const ops: Promise<any>[] = [];
    if (dto.isActive !== undefined) ops.push(this.setSetting(KEY_ACTIVE, String(dto.isActive)));
    if (dto.endAt !== undefined)   ops.push(this.setSetting(KEY_END_AT, dto.endAt));
    if (dto.title !== undefined)   ops.push(this.setSetting(KEY_TITLE, dto.title));
    if (dto.mode !== undefined)    ops.push(this.setSetting(KEY_MODE, dto.mode));
    await Promise.all(ops);
    return this.getConfig();
  }

  async getActiveFlashSale() {
    const config = await this.getConfig();
    if (!config.isActive) return { isActive: false, endAt: null, title: config.title, products: [] };

    const endAt = config.endAt ? new Date(config.endAt) : null;
    const mode = config.mode || 'both';

    let products: any[] = [];

    // Manual items
    if (mode === 'manual' || mode === 'both') {
      const manualItems = await this.prisma.flashSaleItem.findMany({
        orderBy: { sortOrder: 'asc' },
        include: { product: { select: PRODUCT_SELECT } },
      });
      products.push(...manualItems.map(i => i.product));
    }

    // Auto items: products with discount OR sponsored, not already in list
    if (mode === 'auto' || mode === 'both') {
      const existingIds = new Set(products.map((p: any) => p.id));
      const autoProducts = await (this.prisma.product as any).findMany({
        where: {
          status: 'PUBLISHED',
          OR: [
            { salePrice: { not: null } },
            { isSponsored: true },
            { isFeatured: true },
          ],
        },
        orderBy: [{ isSponsored: 'desc' }, { totalSold: 'desc' }],
        take: 20,
        select: PRODUCT_SELECT,
      });
      // Filter out already-included products and add to list
      for (const p of autoProducts) {
        if (!existingIds.has(p.id)) products.push(p);
        if (products.length >= 12) break;
      }
    }

    return { isActive: true, endAt: config.endAt, title: config.title, products };
  }

  async getAutoProducts(limit = 12) {
    return (this.prisma.product as any).findMany({
      where: { status: 'PUBLISHED', salePrice: { not: null } },
      orderBy: { totalSold: 'desc' },
      take: limit,
      select: PRODUCT_SELECT,
    });
  }

  async getManualItems() {
    return this.prisma.flashSaleItem.findMany({
      orderBy: { sortOrder: 'asc' },
      include: { product: { select: PRODUCT_SELECT } },
    });
  }

  async addProduct(productId: string, sortOrder = 0) {
    return this.prisma.flashSaleItem.upsert({
      where: { productId },
      update: { sortOrder },
      create: { productId, sortOrder },
    });
  }

  async removeProduct(productId: string) {
    return this.prisma.flashSaleItem.delete({ where: { productId } });
  }

  async reorderItems(items: { productId: string; sortOrder: number }[]) {
    await Promise.all(
      items.map(({ productId, sortOrder }) =>
        this.prisma.flashSaleItem.update({ where: { productId }, data: { sortOrder } })
      )
    );
  }
}
