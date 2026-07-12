import {
  Controller, Get, Post, Patch, Delete, Body, Param, UseGuards, Query, Res,
} from '@nestjs/common';
import { Response } from 'express';
import { BannersService } from './banners.service';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { RolesGuard } from '../../shared/guards/roles.guard';
import { Roles } from '../../shared/decorators/roles.decorator';

@Controller('banners')
export class BannersController {
  constructor(private svc: BannersService) {}

  // ── PUBLIC ────────────────────────────────────────────────────────────────
  @Get()
  getActive(@Res({ passthrough: true }) res: Response) {
    res.setHeader('Cache-Control', 'public, max-age=60, stale-while-revalidate=300');
    return this.svc.getActive();
  }

  // ── ADMIN ─────────────────────────────────────────────────────────────────
  @Get('admin')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  getAll() {
    return this.svc.getAll();
  }

  @Post('admin')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  create(@Body() dto: {
    position?: string; tag?: string; title?: string; subtitle?: string; ctaText?: string; catFilter?: string;
    imageUrl: string; targetUrl: string; sortOrder?: number; startsAt?: string; endsAt?: string;
  }) {
    return this.svc.create(dto);
  }

  @Patch('admin/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  update(@Param('id') id: string, @Body() dto: any) {
    return this.svc.update(id, dto);
  }

  @Delete('admin/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  remove(@Param('id') id: string) {
    return this.svc.remove(id);
  }
}
