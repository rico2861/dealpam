import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { getEffectiveUnitPrice } from '../products/price-tiers.util';

@Injectable()
export class CartService {
  constructor(private prisma: PrismaService) {}

  async getCart(userId: string) {
    let cart = await this.prisma.cart.findUnique({
      where: { userId },
      include: { items: { include: { product: { include: { images: { where: { isPrimary: true }, take: 1 }, store: { select: { name: true, slug: true } } } } } } }
    });
    if (!cart) cart = await this.prisma.cart.findUnique({
      where: { userId },
      include: { items: { include: { product: { include: { images: { where: { isPrimary: true }, take: 1 }, store: { select: { name: true, slug: true } } } } } } }
    }) ?? await this.prisma.cart.create({ data: { userId }, include: { items: { include: { product: { include: { images: { where: { isPrimary: true }, take: 1 }, store: { select: { name: true, slug: true } } } } } } } });
    const total = (cart.items as any[]).reduce((s, i) => {
      const unit = getEffectiveUnitPrice(i.product?.price, i.product?.salePrice, i.product?.priceTiers, i.quantity);
      return s + unit * i.quantity;
    }, 0);
    return { ...cart, total };
  }

  async addItem(userId: string, productId: string, quantity: number, size?: string, color?: string) {
    const product = await this.prisma.product.findFirst({
      where: { id: productId, status: 'PUBLISHED', stock: { gt: 0 } },
      include: { store: { select: { sellerId: true } } },
    });
    if (!product) throw new NotFoundException('Produit indisponible');

    // Un vendeur ne peut jamais acheter ses propres produits.
    const ownSeller = await this.prisma.seller.findUnique({ where: { userId }, select: { id: true } });
    if (ownSeller && product.store.sellerId === ownSeller.id) {
      throw new BadRequestException("Vous ne pouvez pas ajouter votre propre produit au panier.");
    }

    let cart = await this.prisma.cart.findUnique({ where: { userId } });
    if (!cart) cart = await this.prisma.cart.create({ data: { userId } });

    const existing = await this.prisma.cartItem.findFirst({ where: { cartId: cart.id, productId } });
    const nextQuantity = (existing?.quantity ?? 0) + quantity;
    if (nextQuantity > product.stock) {
      throw new BadRequestException(`Stock insuffisant : ${product.stock} disponible(s) seulement`);
    }
    const minQty = (product as any).minOrderQty || 1;
    if (nextQuantity < minQty) {
      throw new BadRequestException(`Quantité minimum de commande pour ce produit : ${minQty}`);
    }
    if (existing) {
      return this.prisma.cartItem.update({ where: { id: existing.id }, data: { quantity: nextQuantity } });
    }
    return this.prisma.cartItem.create({ data: { cartId: cart.id, productId, quantity, size, color } });
  }

  async updateItem(userId: string, itemId: string, quantity: number) {
    const cart = await this.prisma.cart.findUnique({ where: { userId } });
    if (!cart) throw new NotFoundException();
    const item = await this.prisma.cartItem.findFirst({ where: { id: itemId, cartId: cart.id }, include: { product: true } });
    if (!item) throw new NotFoundException('Article introuvable dans votre panier');
    if (quantity <= 0) return this.prisma.cartItem.delete({ where: { id: itemId } });
    const minQty = (item.product as any).minOrderQty || 1;
    if (quantity < minQty) {
      throw new BadRequestException(`Quantité minimum de commande pour ce produit : ${minQty}`);
    }
    if (quantity > item.product.stock) {
      throw new BadRequestException(`Stock insuffisant : ${item.product.stock} disponible(s) seulement`);
    }
    return this.prisma.cartItem.update({ where: { id: itemId }, data: { quantity } });
  }

  async removeItem(userId: string, itemId: string) {
    const cart = await this.prisma.cart.findUnique({ where: { userId } });
    if (!cart) throw new NotFoundException();
    const item = await this.prisma.cartItem.findFirst({ where: { id: itemId, cartId: cart.id } });
    if (!item) throw new NotFoundException('Article introuvable dans votre panier');
    await this.prisma.cartItem.delete({ where: { id: itemId } });
    return { message: 'Article retiré' };
  }

  async clearCart(userId: string) {
    const cart = await this.prisma.cart.findUnique({ where: { userId } });
    if (cart) await this.prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
    return { message: 'Panier vidé' };
  }
}
