import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class BannersService {
  constructor(private prisma: PrismaService) {}

  getActive() {
    const now = new Date();
    return (this.prisma as any).homepageBanner.findMany({
      where: {
        isActive: true,
        OR: [
          { startsAt: null },
          { startsAt: { lte: now } },
        ],
        AND: [
          { OR: [{ endsAt: null }, { endsAt: { gte: now } }] },
        ],
      },
      orderBy: { sortOrder: 'asc' },
    });
  }

  getAll() {
    return (this.prisma as any).homepageBanner.findMany({ orderBy: { sortOrder: 'asc' } });
  }

  create(dto: { title?: string; imageUrl: string; targetUrl: string; sortOrder?: number; startsAt?: string; endsAt?: string }) {
    return (this.prisma as any).homepageBanner.create({
      data: {
        title:     dto.title || null,
        imageUrl:  dto.imageUrl,
        targetUrl: dto.targetUrl,
        sortOrder: dto.sortOrder ?? 0,
        startsAt:  dto.startsAt ? new Date(dto.startsAt) : null,
        endsAt:    dto.endsAt   ? new Date(dto.endsAt)   : null,
      },
    });
  }

  update(id: string, dto: any) {
    const data: any = {};
    if (dto.title     !== undefined) data.title     = dto.title;
    if (dto.imageUrl  !== undefined) data.imageUrl  = dto.imageUrl;
    if (dto.targetUrl !== undefined) data.targetUrl = dto.targetUrl;
    if (dto.sortOrder !== undefined) data.sortOrder = Number(dto.sortOrder);
    if (dto.isActive  !== undefined) data.isActive  = Boolean(dto.isActive);
    if (dto.startsAt  !== undefined) data.startsAt  = dto.startsAt ? new Date(dto.startsAt) : null;
    if (dto.endsAt    !== undefined) data.endsAt    = dto.endsAt   ? new Date(dto.endsAt)   : null;
    return (this.prisma as any).homepageBanner.update({ where: { id }, data });
  }

  remove(id: string) {
    return (this.prisma as any).homepageBanner.delete({ where: { id } });
  }
}
