import {
  Injectable, NotFoundException, ForbiddenException, BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

// ─────────────────────────────────────────────────────────────────────────────
// Commandes = demandes de contact client → vendeur
// Le client choisit la méthode de paiement du vendeur (MONCASH, CASH, etc.)
// Aucun paiement sur la plateforme pour les clients.
// ─────────────────────────────────────────────────────────────────────────────

@Injectable()
export class OrdersService {
  constructor(private prisma: PrismaService) {}

  // ── Client : passer une commande ──────────────────────────────────────────
  async create(userId: string, addressId: string, chosenPaymentMethod: string, notes?: string) {
    const address = await this.prisma.address.findFirst({ where: { id: addressId, userId } });
    if (!address) throw new NotFoundException('Adresse introuvable');

    const cart = await this.prisma.cart.findUnique({
      where:   { userId },
      include: {
        items: {
          include: {
            product: {
              include: {
                store:  { select: { id: true, sellerId: true, name: true, acceptedPaymentMethods: true } },
                images: { where: { isPrimary: true }, take: 1 },
              },
            },
          },
        },
      },
    });
    if (!cart || cart.items.length === 0) throw new ForbiddenException('Panier vide');

    // Grouper par boutique (une commande par boutique)
    const storeGroups: Record<string, typeof cart.items> = {};
    for (const item of cart.items) {
      const sid = item.product.storeId;
      if (!storeGroups[sid]) storeGroups[sid] = [];
      storeGroups[sid].push(item);
    }

    return this.prisma.$transaction(async (tx) => {
      // Vérifier stock et décrémenter
      for (const item of cart.items) {
        if (item.product.status !== 'PUBLISHED') {
          throw new BadRequestException(`"${item.product.name}" se konnen pou la vant`);
        }
        const updated = await tx.product.updateMany({
          where: { id: item.productId, stock: { gte: item.quantity } },
          data:  { stock: { decrement: item.quantity }, totalSold: { increment: item.quantity } },
        });
        if (updated.count === 0) {
          throw new BadRequestException(`Stock ensifizan pou "${item.product.name}"`);
        }
      }

      const orders = [];
      for (const [storeId, items] of Object.entries(storeGroups)) {
        const subtotal = items.reduce(
          (s, i) => s + Number(i.product.salePrice ?? i.product.price) * i.quantity, 0
        );
        const order = await tx.order.create({
          data: {
            userId,
            storeId,
            addressId,
            notes,
            chosenPaymentMethod, // méthode choisie parmi celles du vendeur
            subtotalHTG: subtotal,
            totalHTG:    subtotal,
            items: {
              create: items.map(i => ({
                productId:   i.productId,
                productName: i.product.name,
                imageUrl:    i.product.images[0]?.urlThumb ?? null,
                quantity:    i.quantity,
                unitPrice:   i.product.salePrice ?? i.product.price,
                subtotal:    Number(i.product.salePrice ?? i.product.price) * i.quantity,
              })),
            },
          },
          include: {
            items: true,
            store: { select: { name: true, slug: true, phone: true, whatsapp: true, moncashPhone: true } },
            address: true,
          },
        });
        orders.push(order);
      }

      // Vider le panier
      await tx.cartItem.deleteMany({ where: { cartId: cart.id } });
      return orders;
    });
  }

  // ── Client : mes commandes ────────────────────────────────────────────────
  findMyOrders(userId: string, page = 1, limit = 10) {
    return this.prisma.order.findMany({
      where:   { userId },
      include: {
        items: true,
        store: { select: { name: true, slug: true, logoUrl: true, phone: true, whatsapp: true, moncashPhone: true } },
      },
      skip: (page - 1) * limit, take: limit,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, userId: string) {
    const order = await this.prisma.order.findFirst({
      where:   { id, userId },
      include: {
        items:   { include: { product: { select: { name: true, slug: true } } } },
        address: true,
        store:   {
          select: {
            name: true, slug: true, phone: true, whatsapp: true,
            moncashPhone: true, acceptedPaymentMethods: true,
          },
        },
      },
    });
    if (!order) throw new NotFoundException('Kòmand pa jwenn');
    return order;
  }

  // ── Vendeur : changer le statut de la commande ────────────────────────────
  async updateStatus(id: string, status: string, sellerId?: string) {
    const SELLER_ALLOWED = ['CONFIRMED', 'PREPARING', 'SHIPPED', 'CANCELLED'];
    const ADMIN_ALLOWED  = ['PENDING', 'CONFIRMED', 'PREPARING', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'REFUNDED'];
    const allowed = sellerId ? SELLER_ALLOWED : ADMIN_ALLOWED;
    if (!allowed.includes(status)) {
      throw new BadRequestException(`Estati envalid. Valè pèmèt: ${allowed.join(', ')}`);
    }
    const where: any = { id };
    if (sellerId) where.store = { sellerId };
    const order = await this.prisma.order.findFirst({ where });
    if (!order) throw new NotFoundException('Kòmand pa jwenn');
    return this.prisma.order.update({ where: { id }, data: { status: status as any } });
  }

  // ── Vendeur : ses commandes ───────────────────────────────────────────────
  findSellerOrders(sellerId: string, page = 1) {
    return this.prisma.order.findMany({
      where:   { store: { sellerId } },
      include: {
        user:    { select: { firstName: true, lastName: true, phone: true } },
        items:   true,
        address: true,
      },
      skip: (page - 1) * 20, take: 20,
      orderBy: { createdAt: 'desc' },
    });
  }

  // ── Admin ─────────────────────────────────────────────────────────────────
  findAll(page = 1, limit = 20) {
    return this.prisma.order.findMany({
      include: {
        user:  { select: { firstName: true, lastName: true, email: true } },
        store: { select: { name: true } },
      },
      skip: (page - 1) * limit, take: limit,
      orderBy: { createdAt: 'desc' },
    });
  }
}
