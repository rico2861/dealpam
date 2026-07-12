import {
  Injectable, NotFoundException, ForbiddenException, BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { NotificationsService } from '../notifications/notifications.service';
import { getEffectiveUnitPrice } from '../products/price-tiers.util';

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
    private notifications: NotificationsService,
  ) {}

  // ── Client : passer une commande ──────────────────────────────────────────
  async create(userId: string, body: {
    addressId?: string;
    notes?: string;
    chosenPaymentMethod?: string;
    deliveryType?: string;
    pickupPointName?: string;
    pickupPointAddress?: string;
    shippingCost?: number;
  }) {
    const { addressId, notes, chosenPaymentMethod, deliveryType, pickupPointName, pickupPointAddress } = body;
    // Le champ shippingHTG existait deja dans le schema mais n'etait jamais
    // renseigne ici — le total de la commande ignorait totalement les frais
    // de livraison calcules et affiches au client pendant le checkout.
    const shippingCost = Math.max(0, Number(body.shippingCost) || 0);

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

    // Un vendeur ne peut jamais acheter ses propres produits sur la plateforme —
    // sinon la même commande apparaît à la fois dans son historique d'achats
    // ET dans ses commandes à traiter en tant que vendeur (les deux listes
    // sont filtrées sur des colonnes différentes — userId vs store.sellerId —
    // qui ne s'excluent pas mutuellement pour une auto-commande).
    const ownSeller = await this.prisma.seller.findUnique({ where: { userId }, select: { id: true } });
    if (ownSeller && cart.items.some(item => item.product.store.sellerId === ownSeller.id)) {
      throw new BadRequestException("Vous ne pouvez pas commander vos propres produits.");
    }

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
        const unitPrices = items.map(i =>
          (i as any).offeredPrice != null
            ? Number((i as any).offeredPrice)
            : getEffectiveUnitPrice(Number(i.product.price), i.product.salePrice ? Number(i.product.salePrice) : null, (i.product as any).priceTiers, i.quantity)
        );
        const subtotal = items.reduce((s, i, idx) => s + unitPrices[idx] * i.quantity, 0);
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
            shippingHTG: shippingCost,
            totalHTG:    subtotal + shippingCost,
            items: {
              create: items.map((i, idx) => ({
                productId:   i.productId,
                productName: i.product.name,
                imageUrl:    i.product.images[0]?.urlThumb ?? null,
                quantity:    i.quantity,
                unitPrice:   unitPrices[idx],
                subtotal:    unitPrices[idx] * i.quantity,
                offeredPrice: (i as any).offeredPrice ?? null,
                offerStatus:  (i as any).offeredPrice != null ? 'PENDING' : null,
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

    // Email notifications — envoyées en arrière-plan, SANS attendre leur fin.
    // Avant : chaque envoi SMTP (souvent lent, parfois plusieurs secondes) était
    // `await`é dans le cycle requête/réponse. Avec 2 emails par commande (vendeur
    // + client), un SMTP lent pouvait dépasser le timeout de 30s côté frontend :
    // la commande était déjà créée en base (transaction déjà validée plus haut),
    // mais le client recevait "Erreur lors de la commande" malgré tout. Ne plus
    // attendre ces envois fait que la réponse HTTP part dès que la commande est
    // en base, quel que soit l'état du serveur mail.
    this.sendOrderEmails(userId, result as any[]).catch(() => {});
    return result;
  }

  private async sendOrderEmails(userId: string, orders: any[]): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { email: true, firstName: true, lastName: true, phone: true } });
    for (const order of orders) {
      // Le vendeur ne recevait jamais le telephone du client (toujours envoye
      // vide) ni sa vraie adresse de livraison (seul le nom du point de
      // retrait etait utilise, meme pour une livraison a domicile) — corrige
      // en utilisant l'adresse liee a la commande (order.address, incluse a
      // la creation) avec repli sur le telephone du compte utilisateur.
      const addr = (order as any).address;
      const customerPhone = addr?.phone || user?.phone || '';
      const customerAddress =
        order.deliveryType === 'PICKUP'
          ? (order.pickupPointName ? `Retrait : ${order.pickupPointName}${order.pickupPointAddress ? ` (${order.pickupPointAddress})` : ''}` : '')
          : addr
            ? `${addr.line1}, ${addr.city}, ${addr.department}`
            : (order.deliveryType === 'CONTACT' ? 'Contact direct — adresse à convenir avec le client' : '');

      // Notify seller
      const sellerUser = await this.prisma.user.findFirst({
        where:  { seller: { stores: { some: { id: order.storeId } } } },
        select: { email: true, firstName: true },
      }).catch(() => null);
      if (sellerUser?.email) {
        await this.mail.sendNewOrderToSeller(sellerUser.email, sellerUser.firstName, {
          number:          order.id.slice(-8).toUpperCase(),
          customerName:    `${user?.firstName} ${user?.lastName}`,
          customerPhone,
          customerEmail:   user?.email || '',
          customerAddress,
          subtotal:        Number(order.subtotalHTG),
          shipping:        Number(order.shippingHTG),
          total:           Number(order.totalHTG),
          paymentMethod:   order.chosenPaymentMethod || undefined,
          deliveryType:    order.deliveryType,
          status:          order.status,
          items:           order.items.map((i: any) => ({ name: i.productName, qty: i.quantity, price: Number(i.unitPrice) })),
        }).catch(() => {});
      }
      // Confirm to customer
      if (user?.email) {
        await this.mail.sendOrderConfirmationToCustomer(user.email, user.firstName, {
          number:     order.id.slice(-8).toUpperCase(),
          sellerName: order.store?.name || '',
          subtotal:   Number(order.subtotalHTG),
          shipping:   Number(order.shippingHTG),
          total:      Number(order.totalHTG),
          items:      order.items.map((i: any) => ({ name: i.productName, qty: i.quantity, price: Number(i.unitPrice) })),
          sellerPhone: (order.store as any)?.phone || undefined,
        }).catch(() => {});
      }
    }
  }

  // ── Client : mes commandes ────────────────────────────────────────────────
  async findMyOrders(userId: string, page = 1, limit = 10, dateFrom?: string, dateTo?: string) {
    const where: any = { userId };
    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = new Date(dateFrom);
      if (dateTo)   where.createdAt.lte = new Date(`${dateTo}T23:59:59.999Z`);
    }
    const [data, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        include: {
          items: true,
          store: { select: { name: true, slug: true, logoUrl: true, phone: true, whatsapp: true, moncashPhone: true } },
        },
        skip: (page - 1) * limit, take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.order.count({ where }),
    ]);
    return { data, total, page, limit };
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
  async updateStatus(id: string, status: string, userId?: string, cancelReason?: string) {
    const SELLER_ALLOWED = ['CONFIRMED', 'PREPARING', 'SHIPPED', 'DELIVERED', 'CANCELLED'];
    const ADMIN_ALLOWED  = ['PENDING', 'CONFIRMED', 'PREPARING', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'REFUNDED'];
    const allowed = userId ? SELLER_ALLOWED : ADMIN_ALLOWED;
    if (!allowed.includes(status)) {
      throw new BadRequestException(`Statut invalide. Valeurs permises: ${allowed.join(', ')}`);
    }
    const where: any = { id };
    if (userId) {
      // Store.sellerId référence Seller.id, pas User.id — il faut résoudre
      // le vendeur à partir de l'utilisateur JWT avant de filtrer la commande,
      // sinon le filtre ne matche jamais (bug: la mise à jour échouait
      // toujours avec "Commande introuvable" pour les vendeurs).
      const seller = await this.prisma.seller.findUnique({ where: { userId }, select: { id: true } });
      if (!seller) throw new NotFoundException('Vendeur introuvable');
      where.store = { sellerId: seller.id };
    }

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
    if (status === 'CANCELLED' && cancelReason) {
      updateData.cancelReason = cancelReason;
    }
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
      // Pas de await ici : un SMTP lent ne doit jamais retarder la réponse du
      // bouton "Confirmer/Annuler/Livré..." (même bug que sur la création de commande).
      this.mail.sendOrderStatusUpdate(
        order.user.email,
        order.user.firstName,
        order.id.slice(-8).toUpperCase(),
        statusLabels[status] || status,
        `Total: ${Number(order.totalHTG).toLocaleString()} HTG`,
      ).catch(() => {});
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

  // Wrapper public utilisé par OrdersCron (l'auto-annulation vit dans un autre
  // provider et n'a pas accès à la méthode privée ci-dessous).
  async applyAutoCancelPenalty(storeId: string) {
    const store = await this.prisma.store.findUnique({ where: { id: storeId }, select: { reputationScore: true } });
    const curScore = Number(store?.reputationScore ?? 100);
    const newScore = Math.max(0, curScore - 10);
    await this.applyReputationPenalty(storeId, newScore, 'Commande non traitée sous 4 jours');
  }

  // ── Vendeur : accepter/refuser/contre-offrir sur un article ──────────────
  async decideOffer(
    userId: string, orderId: string, itemId: string,
    action: 'ACCEPT' | 'REJECT' | 'COUNTER', reason?: string, counterPrice?: number,
  ) {
    const seller = await this.prisma.seller.findUnique({ where: { userId }, select: { id: true } });
    if (!seller) throw new NotFoundException('Vendeur introuvable');

    const order = await this.prisma.order.findFirst({
      where: { id: orderId, store: { sellerId: seller.id } },
      include: {
        items: true,
        user: { select: { id: true, email: true, firstName: true } },
        store: { select: { id: true, name: true } },
      },
    });
    if (!order) throw new NotFoundException('Commande introuvable');

    const item = order.items.find(i => i.id === itemId);
    if (!item) throw new NotFoundException('Article introuvable');
    if (item.offerStatus !== 'PENDING') {
      throw new BadRequestException('Cette offre a déjà été traitée');
    }

    if (action === 'REJECT' && !reason?.trim()) {
      throw new BadRequestException('Un motif de refus est requis');
    }
    if (action === 'COUNTER' && !(counterPrice && counterPrice > 0)) {
      throw new BadRequestException('Un prix de contre-offre valide est requis');
    }

    // Les emails ne sont jamais await — un SMTP lent ne doit pas retarder la
    // réponse au clic sur Accepter/Refuser/Contre-offre (même bug que la
    // création de commande et le changement de statut, déjà corrigé ailleurs).
    if (action === 'ACCEPT') {
      await this.prisma.orderItem.update({ where: { id: itemId }, data: { offerStatus: 'ACCEPTED' } });
      if (order.user?.email) {
        this.mail.sendOfferDecision(
          order.user.email, order.user.firstName, item.productName, Number(item.offeredPrice), 'ACCEPTED',
        ).catch(() => {});
      }
      await this.notifications.create(
        order.user.id,
        'Offre acceptée',
        `Votre offre de ${Number(item.offeredPrice).toLocaleString()} HTG pour "${item.productName}" a été acceptée par le vendeur.`,
        'OFFER_ACCEPTED',
        { orderId, itemId },
      ).catch(() => {});
    } else if (action === 'COUNTER') {
      await this.prisma.orderItem.update({
        where: { id: itemId },
        data: { offerStatus: 'COUNTERED', counterPrice },
      });
      if (order.user?.email) {
        this.mail.sendOfferDecision(
          order.user.email, order.user.firstName, item.productName, Number(item.offeredPrice), 'COUNTERED', reason, counterPrice,
        ).catch(() => {});
      }
      await this.notifications.create(
        order.user.id,
        'Contre-offre du vendeur',
        `Pour "${item.productName}", le vendeur propose ${Number(counterPrice).toLocaleString()} HTG au lieu de votre offre de ${Number(item.offeredPrice).toLocaleString()} HTG. Répondez depuis votre commande.`,
        'OFFER_COUNTERED',
        { orderId, itemId, counterPrice },
      ).catch(() => {});
    } else {
      await this.prisma.orderItem.update({
        where: { id: itemId },
        data: { offerStatus: 'REJECTED', offerRejectionReason: reason },
      });
      // Refus définitif du vendeur (pas une contre-offre) = fin de la négociation :
      // décision commerciale normale, pas une négligence du vendeur — on annule la
      // commande sans appliquer la pénalité -10 habituelle.
      await this.prisma.order.update({
        where: { id: orderId },
        data: { status: 'CANCELLED', cancelReason: reason },
      });
      if (order.user?.email) {
        this.mail.sendOfferDecision(
          order.user.email, order.user.firstName, item.productName, Number(item.offeredPrice), 'REJECTED', reason,
        ).catch(() => {});
      }
      await this.notifications.create(
        order.user.id,
        'Offre refusée',
        `Votre offre pour "${item.productName}" a été refusée définitivement. Motif : ${reason}.`,
        'OFFER_REJECTED',
        { orderId, itemId, reason },
      ).catch(() => {});
    }

    return this.prisma.order.findUnique({ where: { id: orderId }, include: { items: true } });
  }

  // ── Client : répondre à la contre-offre du vendeur ────────────────────────
  // ACCEPT  : finalise au prix du vendeur, commande continue normalement.
  // REJECT  : refus définitif — annule la commande pour de bon (aucune pénalité
  //           de réputation, décision commerciale normale des deux côtés).
  // COUNTER : le client repropose un nouveau prix — repasse la balle au vendeur
  //           (offerStatus revient à PENDING, decideOffer() peut de nouveau
  //           accepter/refuser/contre-offrir). La négociation peut boucler tant
  //           qu'aucune des deux parties ne choisit ACCEPT ou REJECT.
  async respondToCounter(
    userId: string, orderId: string, itemId: string,
    action: 'ACCEPT' | 'REJECT' | 'COUNTER', counterPrice?: number,
  ) {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, userId },
      include: { items: true, store: { select: { id: true, name: true, sellerId: true } } },
    });
    if (!order) throw new NotFoundException('Commande introuvable');

    const item = order.items.find(i => i.id === itemId);
    if (!item) throw new NotFoundException('Article introuvable');
    if (item.offerStatus !== 'COUNTERED') {
      throw new BadRequestException('Aucune contre-offre en attente pour cet article');
    }
    if (action === 'COUNTER' && !(counterPrice && counterPrice > 0)) {
      throw new BadRequestException('Un prix valide est requis');
    }

    const sellerUser = await this.prisma.user.findFirst({
      where: { seller: { id: order.store.sellerId } },
      select: { id: true, email: true, firstName: true },
    }).catch(() => null);

    // Les emails ne sont jamais await (SMTP lent ne doit pas retarder le clic du client).
    if (action === 'ACCEPT') {
      const newUnitPrice = Number(item.counterPrice);
      const newSubtotal  = newUnitPrice * item.quantity;
      await this.prisma.orderItem.update({
        where: { id: itemId },
        data: { offerStatus: 'ACCEPTED', unitPrice: newUnitPrice, subtotal: newSubtotal },
      });
      // Recalcule le total de la commande à partir des sous-totaux à jour de tous ses articles.
      const items = await this.prisma.orderItem.findMany({ where: { orderId } });
      const total = items.reduce((s, i) => s + (i.id === itemId ? newSubtotal : Number(i.subtotal)), 0);
      await this.prisma.order.update({ where: { id: orderId }, data: { subtotalHTG: total, totalHTG: total } });
      if (sellerUser?.email) {
        this.mail.sendMail({
          as: 'seller', to: sellerUser.email,
          subject: `✅ Contre-offre acceptée pour ${item.productName} — DealPam`,
          html: `<p>Le client a accepté votre prix de ${newUnitPrice.toLocaleString()} HTG pour "${item.productName}". La commande #${orderId.slice(-8).toUpperCase()} suit maintenant son cours normal.</p>`,
        }).catch(() => {});
      }
      if (sellerUser?.id) {
        await this.notifications.create(
          sellerUser.id,
          'Contre-offre acceptée',
          `Le client a accepté votre prix de ${newUnitPrice.toLocaleString()} HTG pour "${item.productName}".`,
          'OFFER_ACCEPTED',
          { orderId, itemId },
        ).catch(() => {});
      }
    } else if (action === 'COUNTER') {
      await this.prisma.orderItem.update({
        where: { id: itemId },
        data: { offerStatus: 'PENDING', offeredPrice: counterPrice },
      });
      if (sellerUser?.email) {
        this.mail.sendMail({
          as: 'seller', to: sellerUser.email,
          subject: `🔄 Nouvelle proposition du client pour ${item.productName} — DealPam`,
          html: `<p>Le client a décliné votre prix de ${Number(item.counterPrice).toLocaleString()} HTG pour "${item.productName}" et propose maintenant ${Number(counterPrice).toLocaleString()} HTG. Répondez depuis votre espace vendeur.</p>`,
        }).catch(() => {});
      }
      if (sellerUser?.id) {
        await this.notifications.create(
          sellerUser.id,
          'Nouvelle proposition du client',
          `Pour "${item.productName}", le client propose maintenant ${Number(counterPrice).toLocaleString()} HTG au lieu de votre prix de ${Number(item.counterPrice).toLocaleString()} HTG.`,
          'OFFER_COUNTERED',
          { orderId, itemId, counterPrice },
        ).catch(() => {});
      }
    } else {
      await this.prisma.orderItem.update({ where: { id: itemId }, data: { offerStatus: 'REJECTED' } });
      // Refus définitif du client : décision commerciale normale, pas de pénalité de réputation.
      await this.prisma.order.update({
        where: { id: orderId },
        data: { status: 'CANCELLED', cancelReason: 'Négociation refusée définitivement par le client' },
      });
      if (sellerUser?.email) {
        this.mail.sendMail({
          as: 'seller', to: sellerUser.email,
          subject: `Négociation terminée pour ${item.productName} — DealPam`,
          html: `<p>Le client a refusé définitivement votre prix de ${Number(item.counterPrice).toLocaleString()} HTG pour "${item.productName}". La commande #${orderId.slice(-8).toUpperCase()} a été annulée.</p>`,
        }).catch(() => {});
      }
      if (sellerUser?.id) await this.notifications.create(
        sellerUser.id,
        'Négociation refusée par le client',
        `Le client a refusé définitivement votre prix de ${Number(item.counterPrice).toLocaleString()} HTG pour "${item.productName}". Commande annulée.`,
        'OFFER_REJECTED',
        { orderId, itemId },
      ).catch(() => {});
    }

    return this.prisma.order.findUnique({ where: { id: orderId }, include: { items: true } });
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
  async findSellerOrders(userId: string, page = 1, limit = 20, dateFrom?: string, dateTo?: string) {
    // Store.sellerId référence Seller.id, pas User.id (JWT) — sans cette
    // résolution le filtre ne matchait jamais aucune commande et la liste
    // restait vide en production, sans erreur visible.
    const seller = await this.prisma.seller.findUnique({ where: { userId }, select: { id: true } });
    if (!seller) throw new NotFoundException('Vendeur introuvable');
    const where: any = { store: { sellerId: seller.id } };
    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = new Date(dateFrom);
      if (dateTo)   where.createdAt.lte = new Date(`${dateTo}T23:59:59.999Z`);
    }
    const [data, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        include: {
          user:    { select: { id: true, firstName: true, lastName: true, phone: true, email: true, city: true, department: true } },
          items:   { include: { product: { select: { name: true, images: { take: 1 } } } } },
          address: true,
        },
        skip: (page - 1) * limit, take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.order.count({ where }),
    ]);
    return { data, total, page, limit };
  }

  // ── Admin ─────────────────────────────────────────────────────────────────
  async findAll(page = 1, limit = 20, dateFrom?: string, dateTo?: string) {
    const where: any = {};
    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = new Date(dateFrom);
      if (dateTo)   where.createdAt.lte = new Date(`${dateTo}T23:59:59.999Z`);
    }
    const [data, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        include: {
          user:  { select: { firstName: true, lastName: true, email: true } },
          store: { select: { name: true } },
        },
        skip: (page - 1) * limit, take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.order.count({ where }),
    ]);
    return { data, total, page, limit };
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
