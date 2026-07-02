import { Controller, Get, Query, Param, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { AlgoService } from './algo.service';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { RolesGuard } from '../../shared/guards/roles.guard';
import { Roles } from '../../shared/decorators/roles.decorator';
import { PrismaService } from '../../prisma/prisma.service';

@ApiTags('Algo')
@Controller('algo')
export class AlgoController {
  constructor(
    private algo: AlgoService,
    private prisma: PrismaService,
  ) {}

  @Get('trending')
  getTrending() {
    return this.algo.getTrending();
  }

  @Get('recommendations')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  getRecommendations(
    @Req() req: any,
    @Query('department') department?: string,
    @Query('city') city?: string,
    @Query('limit') limit = '20',
  ) {
    return this.algo.getRecommendations(
      req.user.id,
      department,
      city,
      parseInt(limit),
    );
  }

  @Get('recommendations/session')
  getSessionRecs(
    @Query('sessionId') sessionId: string,
    @Query('department') department?: string,
    @Query('limit') limit = '12',
  ) {
    return this.algo.getSessionRecommendations(sessionId || 'anon', department, parseInt(limit));
  }

  @Get('score/:productId')
  getScore(@Param('productId') productId: string) {
    return this.algo.getProductScore(productId);
  }

  /** Booster IA — Pro Elite only */
  @Get('keywords')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SELLER')
  @ApiBearerAuth()
  async getKeywords(
    @Req() req: any,
    @Query('category') category: string,
  ) {
    // Check plan is ELITE
    const seller = await this.prisma.seller.findUnique({
      where: { userId: req.user.id },
      include: { subscriptions: { where: { isActive: true }, include: { plan: true }, take: 1 } },
    });
    const tier: string = seller?.subscriptions?.[0]?.plan?.tier ?? '';
    if (tier !== 'ELITE') {
      return {
        locked: true,
        requiredPlan: 'ELITE',
        message: 'Le Booster IA est réservé aux vendeurs Plan Pro Elite.',
      };
    }
    return this.algo.getKeywords(req.user.id, category);
  }

  @Get('health')
  getHealth() {
    return this.algo.getHealth();
  }
}
