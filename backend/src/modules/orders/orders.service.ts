import {
  Injectable, NotFoundException, ForbiddenException, BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { MailService } from '../mail/mail.service';

// ─────────────────────────────────────────────────────────────────────────────
// Commandes = demandes de contact client → vendeur
// Le client choisit la méthode de paiement du vendeur (MONCASH, CASH, etc.)
// Aucun paiement sur la plateforme pour les clients.
// ─────────────────────────────────────────────────────────────────────────────

@Injectable()
export class OrdersService {
  constructor(
    private prisma: PrismaService,
    private mail:   MailService,
  ) {}

  // ── Client : passer une commande ──────────────────────────────────────────
  async create(userId: string, body: {
    addressId?: string;
    notes?: string;
    chosenPaymentMethod?: string;
    deliveryType?: string;
    pickupPointName?: string;
    pickupPointAddress?: string;
  }) {
    const { addressId, notes, chosenPaymentMethod, deliveryType, pickupPointName, pickupPointAddress } = body;

    let address = null;
    if (addressId) {
      address = await this.prisma.address.findFirst({ where: { id: addressId, userId } });
      if (!address) throw new NotFoundException('Adresse introuvable');
    }
    // Must have either addressId or pickup point
    if (!addressId && !pickupPointName && deliveryType !== 'CONTACT') {
      throw new BadRequestException('Adresse ou point de retrait requis');
    }

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

    const result = await this.prisma.$transaction(async (tx) => {
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
            addressId:          addressId || null,
            notes,
            chosenPaymentMethod: chosenPaymentMethod || null,
            deliveryType:        deliveryType || 'DELIVERY',
            pickupPointName:     pickupPointName || null,
            pickupPointAddress:  pickupPointAddress || null,
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

    // Email notifications (non-blocking)
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { email: true, firstName: true, lastName: true } });
    for (const order of result as any[]) {
      // Notify seller
      const sellerUser = await this.prisma.user.findFirst({
        where:  { seller: { stores: { some: { id: order.storeId } } } },
        select: { email: true, firstName: true },
      }).catch(() => null);
      if (sellerUser?.email) {
        await this.mail.sendNewOrderToSeller(sellerUser.email, sellerUser.firstName, {
          number:          order.id.slice(-8).toUpperCase(),
          customerName:    `${user?.firstName} ${user?.lastName}`,
          customerPhone:   '',
          customerEmail:   user?.email || '',
          customerAddress: order.pickupPointName || '',
          total:           Number(order.totalHTG),
          items:           order.items.map((i: any) => ({ name: i.productName, qty: i.quantity, price: Number(i.unitPrice) })),
        }).catch(() => {});
      }
      // Confirm to customer
      if (user?.email) {
        await this.mail.sendOrderConfirmationToCustomer(user.email, user.firstName, {
          number:     order.id.slice(-8).toUpperCase(),
          sellerName: order.store?.name || '',
          total:      Number(order.totalHTG),
          items:      order.items.map((i: any) => ({ name: i.productName, qty: i.quantity, price: Number(i.unitPrice) })),
          sellerPhone: (order.store as any)?.phone || undefined,
        }).catch(() => {});
      }
    }
    return result;
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
            email: true, address: true, city: true, department: true,
            seller: { select: { userId: true } },
          },
        },
      },
    });
    if (!order) throw new NotFoundException('Kòmand pa jwenn');
    return order;
  }

  // ── Vendeur : changer le statut de la commande ────────────────────────────
  async updateStatus(id: string, status: string, sellerId?: string) {
    const SELLER_ALLOWED = ['CONFIRMED', 'PREPARING', 'SHIPPED', 'DELIVERED', 'CANCELLED'];
    const ADMIN_ALLOWED  = ['PENDING', 'CONFIRMED', 'PREPARING', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'REFUNDED'];
    const allowed = sellerId ? SELLER_ALLOWED : ADMIN_ALLOWED;
    if (!allowed.includes(status)) {
      throw new BadRequestException(`Statut invalide. Valeurs permises: ${allowed.join(', ')}`);
    }
    const where: any = { id };
    if (sellerId) where.store = { sellerId };

    const order = await this.prisma.order.findFirst({
      where,
      include: {
        user:  { select: { email: true, firstName: true } },
        store: { select: { id: true, sellerId: true, name: true, reputationScore: true } },
        items: true,
      },
    });
    if (!order) throw new NotFoundException('Commande introuvable');

    // REFUNDED n'est qu'un marqueur informatif : la plateforme ne traite jamais le paiement
    // client (paiement direct au vendeur), donc ce statut ne déclenche aucun mouvement de
    // fonds automatique. On restreint son usage aux commandes déjà livrées/annulées pour
    // éviter toute confusion sur une commande encore en cours, et on trace la note associée.
    if (status === 'REFUNDED' && !['DELIVERED', 'CANCELLED'].includes(order.status)) {
      throw new BadRequestException(
        'REFUNDED ne peut être appliqué qu\'à une commande déjà livrée ou annulée (aucun remboursement automatique n\'est effectué — le paiement étant géré hors plateforme)',
      );
    }

    const updateData: any = { status: status as any };
    if (status === 'REFUNDED') {
      updateData.notes = `${order.notes ? order.notes + ' | ' : ''}[REFUNDED marqué le ${new Date().toISOString()} — statut informatif, aucun fonds recrédité automatiquement]`;
    }
    const updated = await this.prisma.order.update({ where: { id }, data: updateData });

    // ── Email notification to customer ────────────────────────────────────
    const EMAIL_TRIGGERS = ['CONFIRMED', 'SHIPPED', 'DELIVERED', 'CANCELLED'];
    if (EMAIL_TRIGGERS.includes(status) && order.user?.email) {
      const statusLabels: Record<string, string> = {
        CONFIRMED: 'Commande confirmée',
        PREPARING: 'En préparation',
        SHIPPED:   'Expédiée / En livraison',
        DELIVERED: 'Livrée avec succès',
        CANCELLED: 'Commande annulée',
        REFUNDED:  'Remboursée',
      };
      await this.mail.sendOrderStatusUpdate(
        order.user.email,
        order.user.firstName,
        order.id.slice(-8).toUpperCase(),
        statusLabels[status] || status,
        `Total: ${Number(order.totalHTG).toLocaleString()} HTG`,
      ).catch(() => {}); // never block on email failure
    }

    // ── Vendor punishment system ──────────────────────────────────────────
    if (order.store) {
      const storeId  = order.store.id;
      const curScore = Number(order.store.reputationScore ?? 100);

      // CANCELLED without good reason: penalty -10 points (min 0)
      if (status === 'CANCELLED' && order.status === 'PENDING') {
        const newScore = Math.max(0, curScore - 10);
        await this.applyReputationPenalty(storeId, newScore,
          'Commande annulée sans traitement');
      }

      // Check if shipped on time (>72h after CONFIRMED = slow: -5 pts)
      if (status === 'SHIPPED' && order.updatedAt) {
        const hoursSinceConfirm = (Date.now() - new Date(order.updatedAt).getTime()) / 3_600_000;
        if (hoursSinceConfirm > 72) {
          const newScore = Math.max(0, curScore - 5);
          await this.applyReputationPenalty(storeId, newScore,
            'Expédition tardive (>72h)');
        }
      }

      // Delivery boosts reputation slightly (max 100)
      if (status === 'DELIVERED') {
        const newScore = Math.min(100, curScore + 2);
        await this.prisma.store.update({ where: { id: storeId }, data: { reputationScore: newScore } });
      }
    }

    return updated;
  }

  private async applyReputationPenalty(storeId: string, newScore: number, reason: string) {
    const data: any = { reputationScore: newScore };
    // If reputation drops below 40: hide from sponsored/featured
    if (newScore < 40) {
      data.isVerified = false;
      // Demote all products of this store from sponsored/featured
      await this.prisma.product.updateMany({
        where: { storeId },
        data:  { isSponsored: false, isFeatured: false },
      });
    }
    await this.prisma.store.update({ where: { id: storeId }, data });
  }

  // ── Vendeur : ses commandes ───────────────────────────────────────────────
  findSellerOrders(sellerId: string, page = 1) {
    return this.prisma.order.findMany({
      where:   { store: { sellerId } },
      include: {
        user:    { select: { firstName: true, lastName: true, phone: true, email: true } },
        items:   { include: { product: { select: { name: true, images: { take: 1 } } } } },
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

  // ── Client: soumettre une référence de transaction (MonCash/NatCash) ──────
  async submitPaymentTransaction(orderId: string, userId: string, txRef: string, method?: string) {
    if (!txRef?.trim()) throw new BadRequestException('Référence de transaction requise');
    const order = await this.prisma.order.findFirst({ where: { id: orderId, userId } });
    if (!order) throw new NotFoundException('Commande introuvable');
    if (order.paymentTxStatus === 'APPROVED') throw new BadRequestException('Paiement déjà validé');

    // Check uniqueness: prevent same txRef being used twice across all orders
    const existing = await this.prisma.order.findFirst({
      where: { paymentTxRef: txRef.trim(), NOT: { id: orderId } },
    });
    if (existing) throw new BadRequestException('Cette référence de transaction a déjà été utilisée');

    return this.prisma.order.update({
      where: { id: orderId },
      data: {
        paymentTxRef:    txRef.trim(),
        paymentTxStatus: 'PENDING_REVIEW',
        chosenPaymentMethod: method || order.chosenPaymentMethod,
      },
    });
  }

  // ── Admin: valider ou rejeter une transaction ─────────────────────────────
  async reviewPaymentTransaction(
    orderId: string, adminId: string,
    status: 'APPROVED' | 'REJECTED' | 'ALREADY_USED' | 'REFUNDED',
    note?: string,
  ) {
    const order = await this.prisma.order.findFirst({ where: { id: orderId } });
    if (!order) throw new NotFoundException('Commande introuvable');

    return this.prisma.order.update({
      where: { id: orderId },
      data: {
        paymentTxStatus:  status,
        paymentTxNote:    note || null,
        paymentVerifiedBy: adminId,
        paymentVerifiedAt: new Date(),
        // Auto-confirm order when payment approved
        ...(status === 'APPROVED' ? { status: 'CONFIRMED' } : {}),
      },
    });
  }

  // ── Admin: liste des transactions en attente ──────────────────────────────
  getPendingPayments(page = 1) {
    return this.prisma.order.findMany({
      where:   { paymentTxRef: { not: null }, paymentTxStatus: 'PENDING_REVIEW' },
      include: {
        user:  { select: { firstName: true, lastName: true, email: true, phone: true } },
        store: { select: { name: true, slug: true, moncashPhone: true } },
        items: { take: 3 },
      },
      skip: (page - 1) * 20, take: 20,
      orderBy: { updatedAt: 'desc' },
    });
  }
}
