import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

const PLATFORM_STORE_SLUG = 'dealpam-officiel';
const PLATFORM_STORE_NAME = 'DealPam Officiel';

@Injectable()
export class PlatformStoreService {
  constructor(private prisma: PrismaService) {}

  private async resolveStore(adminUserId: string) {
    // Find existing platform store
    let store = await this.prisma.store.findFirst({
      where: { isPlatformStore: true },
      include: { seller: { include: { user: { select: { id: true } } } } },
    });
    if (store) return store;

    // Create a seller record for the admin if they don't have one
    let seller = await this.prisma.seller.findUnique({ where: { userId: adminUserId } });
    if (!seller) {
      seller = await this.prisma.seller.create({
        data: {
          userId: adminUserId,
          status: 'APPROVED',
        },
      });
    }

    // Ensure slug uniqueness
    const slugBase = PLATFORM_STORE_SLUG;
    let slug = slugBase;
    let i = 1;
    while (await this.prisma.store.findUnique({ where: { slug } })) {
      slug = `${slugBase}-${i++}`;
    }

    store = await this.prisma.store.create({
      data: {
        sellerId:        seller.id,
        name:            PLATFORM_STORE_NAME,
        slug,
        isPlatformStore: true,
        isVerified:      true,
        isActive:        true,
        isPrimary:       true,
        acceptedPaymentMethods: JSON.stringify(['MONCASH', 'NATCASH', 'BANK_TRANSFER']),
      },
      include: { seller: { include: { user: { select: { id: true } } } } },
    });
    return store;
  }

  async getOrCreate(adminUserId: string) {
    const store = await this.resolveStore(adminUserId);
    let deliveryZones: any[] = [];
    let pickupPoints: any[]  = [];
    try { deliveryZones = JSON.parse((store as any).deliveryZones || '[]'); } catch {}
    try { pickupPoints  = JSON.parse((store as any).pickupPoints  || '[]'); } catch {}
    let paymentMethods: string[] = [];
    try {
      const m = (store as any).acceptedPaymentMethods;
      paymentMethods = Array.isArray(m) ? m : JSON.parse(m || '[]');
    } catch {}
    return { ...store, deliveryZones, pickupPoints, paymentMethods };
  }

  async update(adminUserId: string, body: {
    name?: string; description?: string; phone?: string; email?: string;
    address?: string; city?: string; department?: string;
    moncashPhone?: string; natcashPhone?: string;
    acceptedPaymentMethods?: string[];
    deliveryZones?: any[];
    pickupPoints?: any[];
    logoUrl?: string; bannerUrl?: string;
  }) {
    const store = await this.resolveStore(adminUserId);
    const data: any = {};
    if (body.name        !== undefined) data.name        = body.name;
    if (body.description !== undefined) data.description = body.description;
    if (body.phone       !== undefined) data.phone       = body.phone;
    if (body.email       !== undefined) data.email       = body.email;
    if (body.address     !== undefined) data.address     = body.address;
    if (body.city        !== undefined) data.city        = body.city;
    if (body.department  !== undefined) data.department  = body.department;
    if (body.moncashPhone !== undefined) data.moncashPhone = body.moncashPhone;
    if (body.logoUrl     !== undefined) data.logoUrl     = body.logoUrl;
    if (body.bannerUrl   !== undefined) data.bannerUrl   = body.bannerUrl;
    if (body.acceptedPaymentMethods !== undefined)
      data.acceptedPaymentMethods = JSON.stringify(body.acceptedPaymentMethods);
    if (body.deliveryZones !== undefined)
      data.deliveryZones = JSON.stringify(body.deliveryZones);
    if (body.pickupPoints !== undefined)
      data.pickupPoints = JSON.stringify(body.pickupPoints);

    return this.prisma.store.update({ where: { id: store.id }, data });
  }

  async listProducts(adminUserId: string) {
    const store = await this.resolveStore(adminUserId);
    return this.prisma.product.findMany({
      where: { storeId: store.id },
      include: { images: { take: 1, where: { isPrimary: true } }, category: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async addProduct(adminUserId: string, body: {
    name: string; description?: string; price: number; salePrice?: number;
    stock?: number; categoryId?: string; images?: string[];
    paymentNote?: string;
  }) {
    const store = await this.resolveStore(adminUserId);

    const product = await this.prisma.product.create({
      data: {
        storeId:     store.id,
        name:        body.name,
        slug:        body.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') + '-' + Date.now(),
        description: body.description || '',
        price:       body.price,
        salePrice:   body.salePrice ?? null,
        stock:       body.stock ?? 999,
        status:      'PUBLISHED',
        categoryId:  body.categoryId ?? null,
      },
    });

    // Add images if provided
    if (body.images?.length) {
      await this.prisma.productImage.createMany({
        data: body.images.map((url, i) => ({
          productId: product.id,
          urlFull: url, urlMedium: url, urlThumb: url, publicId: url,
          isPrimary: i === 0,
          sortOrder: i,
        })),
      });
    }

    return this.prisma.product.findUnique({
      where:   { id: product.id },
      include: { images: true },
    });
  }

  async editProduct(adminUserId: string, productId: string, body: any) {
    const store   = await this.resolveStore(adminUserId);
    const product = await this.prisma.product.findFirst({ where: { id: productId, storeId: store.id } });
    if (!product) throw new NotFoundException('Produit introuvable');

    const data: any = {};
    if (body.name        !== undefined) data.name        = body.name;
    if (body.description !== undefined) data.description = body.description;
    if (body.price       !== undefined) data.price       = body.price;
    if (body.salePrice   !== undefined) data.salePrice   = body.salePrice;
    if (body.stock       !== undefined) data.stock       = body.stock;
    if (body.categoryId  !== undefined) data.categoryId  = body.categoryId;

    if (body.images?.length) {
      await this.prisma.productImage.deleteMany({ where: { productId } });
      await this.prisma.productImage.createMany({
        data: body.images.map((url: string, i: number) => ({
          productId, urlFull: url, urlMedium: url, urlThumb: url, publicId: url, isPrimary: i === 0, sortOrder: i,
        })),
      });
    }

    return this.prisma.product.update({ where: { id: productId }, data, include: { images: true } });
  }

  async deleteProduct(adminUserId: string, productId: string) {
    const store   = await this.resolveStore(adminUserId);
    const product = await this.prisma.product.findFirst({ where: { id: productId, storeId: store.id } });
    if (!product) throw new NotFoundException('Produit introuvable');
    await this.prisma.productImage.deleteMany({ where: { productId } });
    return this.prisma.product.delete({ where: { id: productId } });
  }

  async setStatus(adminUserId: string, productId: string, status: string) {
    const store   = await this.resolveStore(adminUserId);
    const product = await this.prisma.product.findFirst({ where: { id: productId, storeId: store.id } });
    if (!product) throw new NotFoundException('Produit introuvable');
    return this.prisma.product.update({ where: { id: productId }, data: { status: status as any } });
  }
}
