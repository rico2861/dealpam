import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class EventsService {
  constructor(private prisma: PrismaService) {}

  async logEvent(data: {
    userId?: string | null;
    sessionId: string;
    eventType: string;
    productId?: string;
    categorySlug?: string;
    searchQuery?: string;
    lat?: number;
    lng?: number;
  }) {
    await (this.prisma as any).userEvent.create({
      data: {
        userId:       data.userId || null,
        sessionId:    data.sessionId,
        eventType:    data.eventType,
        productId:    data.productId || null,
        categorySlug: data.categorySlug || null,
        searchQuery:  data.searchQuery || null,
        lat:          data.lat != null ? Number(data.lat) : null,
        lng:          data.lng != null ? Number(data.lng) : null,
      },
    });
  }

  async logBatch(events: any[]) {
    if (!events?.length) return;
    await (this.prisma as any).userEvent.createMany({
      data: events.map(e => ({
        userId:       e.userId || null,
        sessionId:    e.sessionId || 'anon',
        eventType:    e.eventType || 'VIEW',
        productId:    e.productId || null,
        categorySlug: e.categorySlug || null,
        searchQuery:  e.searchQuery || null,
        lat:          e.lat != null ? Number(e.lat) : null,
        lng:          e.lng != null ? Number(e.lng) : null,
      })),
      skipDuplicates: false,
    });
  }

  /** Top 3 category slugs this user/session viewed in last 7 days */
  async getTopCategories(userId?: string, sessionId?: string): Promise<string[]> {
    const since = new Date(Date.now() - 7 * 24 * 3600 * 1000);
    const where: any = {
      createdAt: { gte: since },
      eventType: { in: ['VIEW', 'CLICK', 'LIKE'] },
      categorySlug: { not: null },
    };
    if (userId) where.userId = userId;
    else if (sessionId) where.sessionId = sessionId;

    const rows = await (this.prisma as any).userEvent.groupBy({
      by:       ['categorySlug'],
      where,
      _count:   { categorySlug: true },
      orderBy:  { _count: { categorySlug: 'desc' } },
      take:     3,
    });
    return rows.map(r => r.categorySlug as string);
  }
}
