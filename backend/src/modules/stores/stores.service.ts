import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class StoresService {
  constructor(private prisma: PrismaService) {}

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
        seller: true,
        _count: { select: { products: true, reviews: true } },
      },
    });
    if (!store) throw new NotFoundException('Boutique introuvable');
    return store;
  }

  // Mise à jour boutique vendeur — incluant méthodes de paiement acceptées
  async updateMe(userId: string, data: {
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
    acceptedPaymentMethods?: string[];  // ex: ['MONCASH', 'CASH', 'BANK_TRANSFER']
    moncashPhone?:           string;    // numéro MonCash du vendeur
  }) {
    const seller = await this.prisma.seller.findUnique({ where: { userId } });
    if (!seller) throw new NotFoundException('Vendeur introuvable');
    return this.prisma.store.update({ where: { sellerId: seller.id }, data });
  }
}
