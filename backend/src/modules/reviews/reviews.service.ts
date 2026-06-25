import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ReviewsService {
  constructor(private prisma: PrismaService) {}
  findByProduct(productId: string) { return this.prisma.review.findMany({ where: { productId, isApproved: true }, include: { user: { select: { firstName: true, lastName: true, avatar: true } } }, orderBy: { createdAt: 'desc' } }); }
  create(userId: string, data: any) { return this.prisma.review.create({ data: { ...data, userId } }); }
  approve(id: string) { return this.prisma.review.update({ where: { id }, data: { isApproved: true } }); }
  delete(id: string) { return this.prisma.review.delete({ where: { id } }); }
  findAll(page = 1) { return this.prisma.review.findMany({ include: { user: { select: { firstName: true, lastName: true } }, product: { select: { name: true } } }, skip: (page-1)*20, take: 20, orderBy: { createdAt: 'desc' } }); }
}
