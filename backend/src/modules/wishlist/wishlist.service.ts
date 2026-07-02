import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class WishlistService {
  constructor(private prisma: PrismaService) {}

  async getWishlist(userId: string) {
    return this.prisma.wishlistItem.findMany({
      where:   { userId },
      include: {
        product: {
          include: {
            images:   { orderBy: { sortOrder: 'asc' }, take: 2 },
            category: { select: { name: true, slug: true } },
            store:    { select: { name: true, slug: true, isVerified: true } },
          },
        },
      },
      orderBy: { addedAt: 'desc' },
    });
  }

  async addToWishlist(userId: string, productId: string) {
    const product = await this.prisma.product.findUnique({ where: { id: productId } });
    if (!product) throw new NotFoundException('Produit introuvable');
    try {
      return await this.prisma.wishlistItem.create({ data: { userId, productId } });
    } catch {
      throw new ConflictException('Produit déjà dans les favoris');
    }
  }

  async removeFromWishlist(userId: string, productId: string) {
    const item = await this.prisma.wishlistItem.findFirst({ where: { userId, productId } });
    if (!item) throw new NotFoundException('Produit non trouvé dans les favoris');
    return this.prisma.wishlistItem.delete({ where: { id: item.id } });
  }

  async isInWishlist(userId: string, productId: string) {
    const item = await this.prisma.wishlistItem.findFirst({ where: { userId, productId } });
    return { inWishlist: !!item };
  }

  async clearWishlist(userId: string) {
    return this.prisma.wishlistItem.deleteMany({ where: { userId } });
  }

  async getCount(userId: string) {
    const count = await this.prisma.wishlistItem.count({ where: { userId } });
    return { count };
  }
}
