import { Controller, Get, Post, Patch, Param, Body, Query, UseGuards, Req, BadRequestException } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { AdsService } from './ads.service';
import { CreateCampaignDto } from './create-campaign.dto';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { RolesGuard } from '../../shared/guards/roles.guard';
import { Roles } from '../../shared/decorators/roles.decorator';
import { CurrentUser } from '../../shared/decorators/current-user.decorator';

@Controller('ads')
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
  @ApiBearerAuth() @UseGuards(JwtAuthGuard, RolesGuard) @Roles('SELLER')
  async create(@CurrentUser() user: any, @Body() dto: CreateCampaignDto) {
    const seller = await this.getSellerId(user.id);
    return this.ads.createCampaign(seller, dto);
  }

  @Get('my')
  @ApiBearerAuth() @UseGuards(JwtAuthGuard, RolesGuard) @Roles('SELLER')
  async getMy(@CurrentUser() user: any, @Query('page') page?: number) {
    const seller = await this.getSellerId(user.id);
    return this.ads.getMyCampaigns(seller, page);
  }

  @Get('my/:id/stats')
  @ApiBearerAuth() @UseGuards(JwtAuthGuard, RolesGuard) @Roles('SELLER')
  async getStats(@CurrentUser() user: any, @Param('id') id: string) {
    const seller = await this.getSellerId(user.id);
    return this.ads.getCampaignStats(id, seller);
  }

  @Patch('my/:id/pause')
  @ApiBearerAuth() @UseGuards(JwtAuthGuard, RolesGuard) @Roles('SELLER')
  async pause(@CurrentUser() user: any, @Param('id') id: string) {
    const seller = await this.getSellerId(user.id);
    return this.ads.pauseCampaign(id, seller);
  }

  @Patch('my/:id/resume')
  @ApiBearerAuth() @UseGuards(JwtAuthGuard, RolesGuard) @Roles('SELLER')
  async resume(@CurrentUser() user: any, @Param('id') id: string) {
    const seller = await this.getSellerId(user.id);
    return this.ads.resumeCampaign(id, seller);
  }

  @Patch('my/:id/publish')
  @ApiBearerAuth() @UseGuards(JwtAuthGuard, RolesGuard) @Roles('SELLER')
  async publish(@CurrentUser() user: any, @Param('id') id: string, @Body() body: { publishAt: string }) {
    const seller = await this.getSellerId(user.id);
    return this.ads.publishCampaign(seller, id, body.publishAt);
  }

  @Patch('my/:id/cancel')
  @ApiBearerAuth() @UseGuards(JwtAuthGuard, RolesGuard) @Roles('SELLER')
  async cancel(@CurrentUser() user: any, @Param('id') id: string) {
    const seller = await this.getSellerId(user.id);
    return this.ads.cancelCampaign(id, seller);
  }

  @Post('my/:id/pay')
  @ApiBearerAuth() @UseGuards(JwtAuthGuard, RolesGuard) @Roles('SELLER')
  async pay(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() body: { method: 'WALLET' | 'MONCASH'; reference?: string },
  ) {
    const seller = await this.getSellerId(user.id);
    return this.ads.payCampaign(id, seller, body.method, body.reference);
  }

  // ── ADMIN ────────────────────────────────────────────────────────────────────

  @Get('admin/all')
  @ApiBearerAuth() @UseGuards(JwtAuthGuard, RolesGuard) @Roles('ADMIN', 'SUPER_ADMIN')
  getAll(@Query('page') page?: number, @Query('status') status?: string) {
    return this.ads.getAllCampaigns(page, status);
  }

  @Get('admin/stats')
  @ApiBearerAuth() @UseGuards(JwtAuthGuard, RolesGuard) @Roles('ADMIN', 'SUPER_ADMIN')
  getAdminStats() {
    return this.ads.getAdminStats();
  }

  @Patch('admin/:id/review')
  @ApiBearerAuth() @UseGuards(JwtAuthGuard, RolesGuard) @Roles('ADMIN', 'SUPER_ADMIN')
  review(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body() body: { action: 'approve' | 'reject'; note?: string },
  ) {
    return this.ads.reviewCampaign(id, user.id, body.action, body.note);
  }

  @Patch('admin/:id/status')
  @ApiBearerAuth() @UseGuards(JwtAuthGuard, RolesGuard) @Roles('ADMIN', 'SUPER_ADMIN')
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
