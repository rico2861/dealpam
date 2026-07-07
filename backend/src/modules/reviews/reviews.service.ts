import { BadRequestException, ConflictException, ForbiddenException, Injectable } from '@nestjs/common';
import { ArrayMaxSize, IsArray, IsInt, IsOptional, IsString, IsUrl, IsUUID, Max, MaxLength, Min } from 'class-validator';
import { PrismaService } from '../../prisma/prisma.service';

export class CreateReviewDto {
  @IsOptional() @IsUUID() productId?: string;
  @IsOptional() @IsUUID() storeId?: string;
  @IsOptional() @IsUUID() orderId?: string;
  @IsInt() @Min(1) @Max(5) rating: number;
  @IsOptional() @IsString() @MaxLength(2000) comment?: string;
  @IsOptional() @IsArray() @ArrayMaxSize(6) @IsUrl({}, { each: true }) images?: string[];
}

@Injectable()
export class ReviewsService {
  constructor(private prisma: PrismaService) {}
  findByProduct(productId: string) { return this.prisma.review.findMany({ where: { productId, isApproved: true }, include: { user: { select: { firstName: true, lastName: true, avatar: true } } }, orderBy: { createdAt: 'desc' } }); }

  async create(userId: string, data: CreateReviewDto) {
    if (data.productId) {
      const product = await this.prisma.product.findUnique({
        where: { id: data.productId },
        select: { store: { select: { seller: { select: { userId: true } } } } },
      });
      if (product?.store?.seller.userId === userId) {
        throw new ForbiddenException('Vous ne pouvez pas noter votre propre produit');
      }
    }
    if (data.storeId) {
      const store = await this.prisma.store.findUnique({
        where: { id: data.storeId },
        select: { seller: { select: { userId: true } } },
      });
      if (store?.seller.userId === userId) {
        throw new ForbiddenException('Vous ne pouvez pas noter votre propre boutique');
      }
    }

    // Un avis boutique doit obligatoirement référencer une commande livrée
    // appartenant à ce client — sinon n'importe qui pourrait noter une
    // boutique sans jamais avoir commandé chez elle (le frontend affichait
    // déjà ce garde-fou, mais rien ne l'appliquait côté serveur avant ce fix).
    if (data.storeId) {
      if (!data.orderId) throw new BadRequestException('Un avis boutique doit référencer une commande livrée');
      const order = await this.prisma.order.findUnique({ where: { id: data.orderId }, select: { userId: true, storeId: true, status: true } });
      if (!order || order.userId !== userId) throw new ForbiddenException('Commande introuvable');
      if (order.status !== 'DELIVERED') throw new BadRequestException('Cette commande doit être livrée avant de pouvoir être notée');
      if (order.storeId !== data.storeId) throw new BadRequestException('Cette commande ne correspond pas à cette boutique');
    }

    try {
      return await this.prisma.review.create({
        data: {
          productId: data.productId, storeId: data.storeId, orderId: data.orderId,
          rating: data.rating, comment: data.comment,
          images: data.images?.length ? JSON.stringify(data.images) : undefined,
          userId,
        },
      });
    } catch (err: any) {
      if (err?.code === 'P2002') throw new ConflictException('Vous avez déjà laissé un avis pour cette boutique');
      throw err;
    }
  }
  approve(id: string) { return this.prisma.review.update({ where: { id }, data: { isApproved: true } }); }
  delete(id: string) { return this.prisma.review.delete({ where: { id } }); }
  findAll(page = 1) { return this.prisma.review.findMany({ include: { user: { select: { firstName: true, lastName: true } }, product: { select: { name: true } } }, skip: (page-1)*20, take: 20, orderBy: { createdAt: 'desc' } }); }
}
