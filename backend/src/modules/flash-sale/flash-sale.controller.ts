import { Controller, Get, Post, Delete, Patch, Body, Param, UseGuards, Query } from '@nestjs/common';
import { FlashSaleService } from './flash-sale.service';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { RolesGuard } from '../../shared/guards/roles.guard';
import { Roles } from '../../shared/decorators/roles.decorator';

@Controller('flash-sale')
export class FlashSaleController {
  constructor(private svc: FlashSaleService) {}

  // ── Public ────────────────────────────────────────────────────────────────

  @Get('active')
  getActive() { return this.svc.getActiveFlashSale(); }

  // ── Admin ────────────────────────────────────────────────────────────────

  @Get('config')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  getConfig() { return this.svc.getConfig(); }

  @Patch('config')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  updateConfig(@Body() dto: { isActive?: boolean; endAt?: string; title?: string; mode?: string }) {
    return this.svc.updateConfig(dto);
  }

  @Get('items')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  getItems() { return this.svc.getManualItems(); }

  @Get('auto-products')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  getAutoProducts(@Query('limit') limit?: string) {
    return this.svc.getAutoProducts(limit ? Number(limit) : 20);
  }

  @Post('items')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  addProduct(@Body() dto: { productId: string; sortOrder?: number }) {
    return this.svc.addProduct(dto.productId, dto.sortOrder ?? 0);
  }

  @Delete('items/:productId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  removeProduct(@Param('productId') productId: string) {
    return this.svc.removeProduct(productId);
  }

  @Patch('items/reorder')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  reorder(@Body() body: { items: { productId: string; sortOrder: number }[] }) {
    return this.svc.reorderItems(body.items);
  }
}
