import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class OrdersService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, addressId: string, notes?: string) {
    const cart = await this.prisma.cart.findUnique({
      where: { userId },
      include: { items: { include: { product: { include: { images: { where: { isPrimary: true }, take: 1 } } } } } }
    });
    if (!cart || cart.items.length === 0) throw new ForbiddenException('Panier vide');

    const storeGroups = cart.items.reduce((acc: any, item) => {
      const key = item.product.storeId;
      if (!acc[key]) acc[key] = [];
      acc[key].push(item);
      return acc;
    }, {});

    const orders = [];
    for (const [storeId, items] of Object.entries(storeGroups) as any) {
      const subtotal = items.reduce((s: number, i: any) => s + Number(i.product.salePrice || i.product.price) * i.quantity, 0);
      const order = await this.prisma.order.create({
        data: {
          userId, storeId, addressId, notes,
          subtotalHTG: subtotal, totalHTG: subtotal,
          items: {
            create: items.map((i: any) => ({
              productId: i.productId,
              productName: i.product.name,
              imageUrl: i.product.images[0]?.url || null,
              quantity: i.quantity,
              unitPrice: i.product.salePrice || i.product.price,
              subtotal: Number(i.product.salePrice || i.product.price) * i.quantity,
            }))
          }
        },
        include: { items: true }
      });
      orders.push(order);
    }

    await this.prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
    return orders;
  }

  findMyOrders(userId: string, page = 1, limit = 10) {
    return this.prisma.order.findMany({
      where: { userId },
      include: { items: true, store: { select: { name: true, slug: true, logoUrl: true } }, payment: true },
      skip: (page-1)*limit, take: limit,
      orderBy: { createdAt: 'desc' }
    });
  }

  async findOne(id: string, userId: string) {
    const order = await this.prisma.order.findFirst({
      where: { id, userId },
      include: { items: { include: { product: true } }, address: true, payment: true, store: true }
    });
    if (!order) throw new NotFoundException('Commande introuvable');
    return order;
  }

  async updateStatus(id: string, status: string, sellerId?: string) {
    const where: any = { id };
    if (sellerId) where.store = { sellerId };
    const order = await this.prisma.order.findFirst({ where });
    if (!order) throw new NotFoundException();
    return this.prisma.order.update({ where: { id }, data: { status: status as any } });
  }

  findAll(page = 1, limit = 20) {
    return this.prisma.order.findMany({
      include: { user: { select: { firstName: true, lastName: true, email: true } }, store: { select: { name: true } } },
      skip: (page-1)*limit, take: limit,
      orderBy: { createdAt: 'desc' }
    });
  }

  findSellerOrders(sellerId: string, page = 1) {
    return this.prisma.order.findMany({
      where: { store: { sellerId } },
      include: { user: { select: { firstName: true, lastName: true } }, items: true },
      skip: (page-1)*20, take: 20,
      orderBy: { createdAt: 'desc' }
    });
  }
}
