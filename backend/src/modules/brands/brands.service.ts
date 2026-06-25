import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class BrandsService {
  constructor(private prisma: PrismaService) {}
  findAll() { return this.prisma.brand.findMany({ where: { isActive: true }, orderBy: { name: 'asc' } }); }
  create(data: any) { return this.prisma.brand.create({ data: { ...data, slug: data.name.toLowerCase().replace(/\s+/g,'-') } }); }
  update(id: string, data: any) { return this.prisma.brand.update({ where: { id }, data }); }
  remove(id: string) { return this.prisma.brand.update({ where: { id }, data: { isActive: false } }); }
}
