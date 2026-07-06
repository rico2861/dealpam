import { Controller, Get, Post, Patch, Delete, Param, Body, Query, UseGuards, Res } from '@nestjs/common';
import { Response } from 'express';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { IsOptional, IsString, IsEmail, MaxLength, IsArray, IsEnum, MinLength, IsIn, IsNumber, Min } from 'class-validator';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { RolesGuard } from '../../shared/guards/roles.guard';
import { Roles } from '../../shared/decorators/roles.decorator';
import { CurrentUser } from '../../shared/decorators/current-user.decorator';
import { StoresService } from './stores.service';

class CreateStoreDto {
  @IsString() @MinLength(2) @MaxLength(100) name: string;
  @IsOptional() @IsString() @MaxLength(1000) description?: string;
  @IsOptional() @IsString() @MaxLength(100) city?: string;
  @IsOptional() @IsString() @MaxLength(100) department?: string;
  @IsOptional() @IsString() @MaxLength(20) phone?: string;
  @IsOptional() @IsEmail() email?: string;
  @IsOptional() @IsString() @MaxLength(20) whatsapp?: string;
}

class UpdateStoreDto {
  @IsOptional() @IsString() @MaxLength(100) name?: string;
  @IsOptional() @IsString() @MaxLength(1000) description?: string;
  @IsOptional() @IsString() logoUrl?: string;
  @IsOptional() @IsString() bannerUrl?: string;
  @IsOptional() @IsString() @MaxLength(20) phone?: string;
  @IsOptional() @IsEmail() email?: string;
  @IsOptional() @IsString() @MaxLength(20) whatsapp?: string;
  @IsOptional() @IsString() @MaxLength(200) address?: string;
  @IsOptional() @IsString() @MaxLength(100) city?: string;
  @IsOptional() @IsString() @MaxLength(100) department?: string;
  @IsOptional() @IsArray() acceptedPaymentMethods?: string[];
  @IsOptional() @IsString() @MaxLength(20) moncashPhone?: string;
  @IsOptional() @IsIn(['HTG', 'USD']) currency?: string;
  @IsOptional() @IsNumber() @Min(0.0001) exchangeRate?: number;
}

@ApiTags('Stores')
@Controller('stores')
export class StoresController {
  constructor(private storesService: StoresService) {}

  // ── Public ────────────────────────────────────────────────────────────────

  @Get()
  @ApiOperation({ summary: 'Liste des boutiques' })
  findAll(@Query('page') page: number, @Res({ passthrough: true }) res: Response) {
    res.setHeader('Cache-Control', 'public, max-age=60, stale-while-revalidate=300');
    return this.storesService.findAll(page);
  }

  @Get(':slug')
  @ApiOperation({ summary: 'Boutique par slug' })
  findBySlug(@Param('slug') slug: string, @Res({ passthrough: true }) res: Response) {
    res.setHeader('Cache-Control', 'public, max-age=120, stale-while-revalidate=600');
    return this.storesService.findBySlug(slug);
  }

  @Get(':slug/options')
  @ApiOperation({ summary: 'Points de retrait + zones de livraison (public)' })
  async getDeliveryOptions(@Param('slug') slug: string, @Res({ passthrough: true }) res: Response) {
    res.setHeader('Cache-Control', 'public, max-age=120, stale-while-revalidate=600');
    const store = await this.storesService.findBySlug(slug);
    let pickupPoints: any[] = [];
    let deliveryZones: any[] = [];
    try { pickupPoints  = JSON.parse((store as any).pickupPoints  || '[]'); } catch {}
    try { deliveryZones = JSON.parse((store as any).deliveryZones || '[]'); } catch {}
    return {
      storeId:   store.id,
      storeName: store.name,
      slug:      (store as any).slug,
      phone:     (store as any).phone     ?? null,
      email:     (store as any).email     ?? null,
      address:   (store as any).address   ?? null,
      city:      (store as any).city      ?? null,
      department:(store as any).department ?? null,
      moncashPhone: (store as any).moncashPhone ?? null,
      acceptedPaymentMethods: (store as any).acceptedPaymentMethods,
      sellerUserId: (store as any).seller?.userId ?? null,
      pickupPoints,
      deliveryZones,
    };
  }

  // ── Seller ────────────────────────────────────────────────────────────────

  @Get('me/all')
  @ApiBearerAuth() @UseGuards(JwtAuthGuard, RolesGuard) @Roles('SELLER')
  @ApiOperation({ summary: 'Toutes mes boutiques + limite du plan' })
  getMyStores(@CurrentUser() u: any) { return this.storesService.getMyStores(u.id); }

  @Post('me')
  @ApiBearerAuth() @UseGuards(JwtAuthGuard, RolesGuard) @Roles('SELLER')
  @ApiOperation({ summary: 'Créer une nouvelle boutique (selon plan)' })
  createStore(@CurrentUser() u: any, @Body() dto: CreateStoreDto) {
    return this.storesService.createStore(u.id, dto);
  }

  @Patch('me')
  @ApiBearerAuth() @UseGuards(JwtAuthGuard, RolesGuard) @Roles('SELLER')
  @ApiOperation({ summary: 'Mettre à jour la boutique principale' })
  updateMe(@CurrentUser() u: any, @Body() data: UpdateStoreDto) {
    return this.storesService.updateMe(u.id, data);
  }

  @Patch('me/:storeId')
  @ApiBearerAuth() @UseGuards(JwtAuthGuard, RolesGuard) @Roles('SELLER')
  @ApiOperation({ summary: 'Mettre à jour une boutique spécifique' })
  updateStore(@CurrentUser() u: any, @Param('storeId') storeId: string, @Body() data: UpdateStoreDto) {
    return this.storesService.updateStore(u.id, storeId, data);
  }

  @Delete('me/:storeId')
  @ApiBearerAuth() @UseGuards(JwtAuthGuard, RolesGuard) @Roles('SELLER')
  @ApiOperation({ summary: 'Supprimer une boutique non-principale' })
  deleteStore(@CurrentUser() u: any, @Param('storeId') storeId: string) {
    return this.storesService.deleteStore(u.id, storeId);
  }

  @Patch('me/:storeId/pickup-points')
  @ApiBearerAuth() @UseGuards(JwtAuthGuard, RolesGuard) @Roles('SELLER')
  @ApiOperation({ summary: 'Mettre à jour les points de retrait' })
  updatePickupPoints(
    @CurrentUser() u: any,
    @Param('storeId') storeId: string,
    @Body('pickupPoints') points: any[],
  ) {
    return this.storesService.updateStore(u.id, storeId, {
      pickupPoints: JSON.stringify(points || []),
    } as any);
  }

  @Patch('me/:storeId/delivery-zones')
  @ApiBearerAuth() @UseGuards(JwtAuthGuard, RolesGuard) @Roles('SELLER')
  @ApiOperation({ summary: 'Mettre à jour les zones de livraison' })
  updateDeliveryZones(
    @CurrentUser() u: any,
    @Param('storeId') storeId: string,
    @Body('deliveryZones') zones: any[],
  ) {
    return this.storesService.updateStore(u.id, storeId, {
      deliveryZones: JSON.stringify(zones || []),
    } as any);
  }
}
