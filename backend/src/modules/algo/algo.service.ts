import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AlgoService {
  private readonly logger = new Logger(AlgoService.name);
  private readonly baseUrl: string;
  private readonly secret: string;

  constructor(
    private config: ConfigService,
    private http: HttpService,
    private prisma: PrismaService,
  ) {
    this.baseUrl = config.get('ALGO_SERVICE_URL') || 'http://localhost:8001/api';
    this.secret  = config.get('ALGO_SECRET')      || 'changeme';
  }

  private headers() {
    return { 'X-Algo-Secret': this.secret };
  }

  private async call<T>(path: string, params: Record<string, any> = {}): Promise<T | null> {
    try {
      const { data } = await firstValueFrom(
        this.http.get<T>(`${this.baseUrl}${path}`, {
          params,
          headers: this.headers(),
          timeout: 5000,
        }),
      );
      return data;
    } catch (e: any) {
      this.logger.warn(`Algo-service call failed [${path}]: ${e.message}`);
      return null;
    }
  }

  async getRecommendations(userId: string, department?: string, city?: string, limit = 20) {
    const result = await this.call<any>(`/recommendations/${userId}`, { department, city, limit });
    if (!result) return this.fallbackRecommendations(limit, department);
    return result;
  }

  async getSessionRecommendations(sessionId: string, department?: string, limit = 12) {
    const result = await this.call<any>(`/recommendations/session/${sessionId}`, { department, limit });
    if (!result) return { source: 'fallback', products: [] };
    return result;
  }

  async getTrending() {
    const result = await this.call<any>('/trending');
    if (!result) {
      // Fallback: read from DB
      const row = await (this.prisma as any).trendingCache?.findUnique({ where: { id: 1 } }).catch(() => null);
      return row?.data ?? { searches: [], categories: [], products: [] };
    }
    return result;
  }

  async getProductScore(productId: string) {
    const result = await this.call<any>(`/score/${productId}`);
    return result ?? { product_id: productId, score: 0 };
  }

  async getKeywords(sellerId: string, category: string) {
    return this.call<any>(`/keywords/${sellerId}`, { category });
  }

  async getHealth() {
    return this.call<any>('/health');
  }

  // Fallback when algo-service is down
  private async fallbackRecommendations(limit: number, department?: string) {
    const where: any = { status: 'PUBLISHED' };
    if (department) {
      where.OR = [
        { department: { contains: department } },
        { store: { department: { contains: department } } },
        { store: { deliveryZones: { contains: department } } },
      ];
    }
    const products = await this.prisma.product.findMany({
      where,
      include: {
        images:   { orderBy: { sortOrder: 'asc' }, take: 1 },
        category: { select: { name: true, slug: true } },
        store:    { select: { name: true, slug: true } },
      },
      orderBy: [{ viewCount: 'desc' }],
      take:    limit,
    });
    return { source: 'fallback', products };
  }
}
