import { Controller, Get, Post, Patch, Param, Body, Query, UseGuards, Req } from '@nestjs/common';
import { AdsService } from './ads.service';
import { CreateCampaignDto } from './create-campaign.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('ads')
@UseGuards(JwtAuthGuard)
export class AdsController {
  constructor(private ads: AdsService) {}

  // ── PUBLIC (no auth needed) ─────────────────────────────────────────────────

  @Get('serve')
  serve(
    @Query('department') department?: string,
    @Query('gender') gender?: string,
    @Query('age') age?: string,
    @Query('limit') limit?: string,
  ) {
    return this.ads.getAdsForUser({
      department,
      gender,
      age: age ? parseInt(age) : undefined,
      limit: limit ? parseInt(limit) : 8,
    });
  }

  @Post('track/:campaignId/:type')
  track(
    @Param('campaignId') campaignId: string,
    @Param('type') type: 'IMPRESSION' | 'CLICK' | 'CONVERSION',
    @CurrentUser() user: any,
    @Query('dept') dept?: string,
  ) {
    return this.ads.trackEvent(campaignId, type, user?.id, dept);
  }

  // ── SELLER ──────────────────────────────────────────────────────────────────

  @Post()
  @Roles('SELLER')
  @UseGuards(RolesGuard)
  async create(@CurrentUser() user: any, @Body() dto: CreateCampaignDto) {
    const seller = await this.getSellerId(user.id);
    return this.ads.createCampaign(seller, dto);
  }

  @Get('my')
  @Roles('SELLER')
  @UseGuards(RolesGuard)
  async getMy(@CurrentUser() user: any, @Query('page') page?: number) {
    const seller = await this.getSellerId(user.id);
    return this.ads.getMyCampaigns(seller, page);
  }

  @Get('my/:id/stats')
  @Roles('SELLER')
  @UseGuards(RolesGuard)
  async getStats(@CurrentUser() user: any, @Param('id') id: string) {
    const seller = await this.getSellerId(user.id);
    return this.ads.getCampaignStats(id, seller);
  }

  @Patch('my/:id/pause')
  @Roles('SELLER')
  @UseGuards(RolesGuard)
  async pause(@CurrentUser() user: any, @Param('id') id: string) {
    const seller = await this.getSellerId(user.id);
    return this.ads.pauseCampaign(id, seller);
  }

  @Patch('my/:id/resume')
  @Roles('SELLER')
  @UseGuards(RolesGuard)
  async resume(@CurrentUser() user: any, @Param('id') id: string) {
    const seller = await this.getSellerId(user.id);
    return this.ads.resumeCampaign(id, seller);
  }

  @Patch('my/:id/cancel')
  @Roles('SELLER')
  @UseGuards(RolesGuard)
  async cancel(@CurrentUser() user: any, @Param('id') id: string) {
    const seller = await this.getSellerId(user.id);
    return this.ads.cancelCampaign(id, seller);
  }

  // ── ADMIN ────────────────────────────────────────────────────────────────────

  @Get('admin/all')
  @Roles('ADMIN', 'SUPER_ADMIN')
  @UseGuards(RolesGuard)
  getAll(@Query('page') page?: number, @Query('status') status?: string) {
    return this.ads.getAllCampaigns(page, status);
  }

  @Get('admin/stats')
  @Roles('ADMIN', 'SUPER_ADMIN')
  @UseGuards(RolesGuard)
  getAdminStats() {
    return this.ads.getAdminStats();
  }

  @Patch('admin/:id/review')
  @Roles('ADMIN', 'SUPER_ADMIN')
  @UseGuards(RolesGuard)
  review(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body() body: { action: 'approve' | 'reject'; note?: string },
  ) {
    return this.ads.reviewCampaign(id, user.id, body.action, body.note);
  }

  @Patch('admin/:id/status')
  @Roles('ADMIN', 'SUPER_ADMIN')
  @UseGuards(RolesGuard)
  forceStatus(@Param('id') id: string, @Body('status') status: string) {
    return this.ads.adminForceStatus(id, status);
  }

  // Helper: get sellerId from userId
  private async getSellerId(userId: string): Promise<string> {
    const { PrismaService } = await import('../../prisma/prisma.service');
    // Use injected prisma via service — workaround: controller imports prisma directly
    const prisma = (this.ads as any).prisma as import('@prisma/client').PrismaClient;
    const seller = await prisma.seller.findUnique({ where: { userId } });
    if (!seller) throw new Error('Seller not found');
    return seller.id;
  }
}
