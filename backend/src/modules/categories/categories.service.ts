import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class CategoriesService {
  constructor(private prisma: PrismaService) {}

  findAll() {
    return this.prisma.category.findMany({
      where: { parentId: null, isActive: true },
      include: { children: { where: { isActive: true } }, _count: { select: { products: true } } },
      orderBy: { sortOrder: 'asc' }
    });
  }

  create(data: any) { return this.prisma.category.create({ data }); }
  update(id: string, data: any) { return this.prisma.category.update({ where: { id }, data }); }
  remove(id: string) { return this.prisma.category.update({ where: { id }, data: { isActive: false } }); }
}
