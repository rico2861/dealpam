import { ForbiddenException, Injectable } from '@nestjs/common';
import { IsInt, IsOptional, IsString, IsUUID, Max, MaxLength, Min } from 'class-validator';
import { PrismaService } from '../../prisma/prisma.service';

export class CreateReviewDto {
  @IsOptional() @IsUUID() productId?: string;
  @IsOptional() @IsUUID() storeId?: string;
  @IsInt() @Min(1) @Max(5) rating: number;
  @IsOptional() @IsString() @MaxLength(2000) comment?: string;
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
    return this.prisma.review.create({ data: { productId: data.productId, storeId: data.storeId, rating: data.rating, comment: data.comment, userId } });
  }
  approve(id: string) { return this.prisma.review.update({ where: { id }, data: { isApproved: true } }); }
  delete(id: string) { return this.prisma.review.delete({ where: { id } }); }
  findAll(page = 1) { return this.prisma.review.findMany({ include: { user: { select: { firstName: true, lastName: true } }, product: { select: { name: true } } }, skip: (page-1)*20, take: 20, orderBy: { createdAt: 'desc' } }); }
}
