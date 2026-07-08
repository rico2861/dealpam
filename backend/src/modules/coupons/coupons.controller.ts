import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { RolesGuard } from '../../shared/guards/roles.guard';
import { Roles } from '../../shared/decorators/roles.decorator';
import { CurrentUser } from '../../shared/decorators/current-user.decorator';
import { CouponsService } from './coupons.service';

@ApiTags('Coupons')
@Controller('coupons')
export class CouponsController {
  constructor(private cs: CouponsService) {}

  // ── Utilisateur : vérifier un code avant de payer ────────────────────────
  @Post('validate')
  @ApiBearerAuth() @UseGuards(JwtAuthGuard)
  validate(@CurrentUser() u: any, @Body() body: { code: string; context: 'SUBSCRIPTION' | 'PLATFORM_PRODUCT'; amountHTG: number }) {
    return this.cs.validate(body.code, body.context, u.id, body.amountHTG);
  }

  // ── Admin : CRUD ──────────────────────────────────────────────────────────
  @Get('admin')
  @ApiBearerAuth() @UseGuards(JwtAuthGuard, RolesGuard) @Roles('ADMIN', 'SUPER_ADMIN')
  getAllAdmin() { return this.cs.getAllAdmin(); }

  @Post('admin')
  @ApiBearerAuth() @UseGuards(JwtAuthGuard, RolesGuard) @Roles('ADMIN', 'SUPER_ADMIN')
  create(@Body() dto: any) { return this.cs.create(dto); }

  @Patch('admin/:id')
  @ApiBearerAuth() @UseGuards(JwtAuthGuard, RolesGuard) @Roles('ADMIN', 'SUPER_ADMIN')
  update(@Param('id') id: string, @Body() dto: any) { return this.cs.update(id, dto); }

  @Delete('admin/:id')
  @ApiBearerAuth() @UseGuards(JwtAuthGuard, RolesGuard) @Roles('ADMIN', 'SUPER_ADMIN')
  remove(@Param('id') id: string) { return this.cs.remove(id); }
}
