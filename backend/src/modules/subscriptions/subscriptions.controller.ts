import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { RolesGuard } from '../../shared/guards/roles.guard';
import { Roles } from '../../shared/decorators/roles.decorator';
import { CurrentUser } from '../../shared/decorators/current-user.decorator';
import { SubscriptionsService } from './subscriptions.service';

// Le paiement des abonnements est géré par POST /payments/subscription/initiate
// Ce controller expose la lecture des plans, l'abonnement actif, l'essai gratuit,
// et la gestion admin des plans (CRUD).

@ApiTags('Subscriptions')
@Controller('subscriptions')
export class SubscriptionsController {
  constructor(private ss: SubscriptionsService) {}

  @Get('plans')
  getPlans() { return this.ss.getPlans(); }

  @Get('me')
  @ApiBearerAuth() @UseGuards(JwtAuthGuard, RolesGuard) @Roles('SELLER')
  getMySubscription(@CurrentUser() u: any) { return this.ss.getMySubscription(u.id); }

  // ── Essai gratuit 30 jours (une seule fois par personne — email/tél/NIF) ───
  @Post('trial')
  @ApiBearerAuth() @UseGuards(JwtAuthGuard, RolesGuard) @Roles('SELLER')
  startTrial(@CurrentUser() u: any) { return this.ss.startTrial(u.id); }

  // ── Annulation : effective à la fin de la période déjà payée ─────────────
  @Post('cancel')
  @ApiBearerAuth() @UseGuards(JwtAuthGuard, RolesGuard) @Roles('SELLER')
  cancelSubscription(@CurrentUser() u: any) { return this.ss.cancelSubscription(u.id); }

  @Post('cancel/undo')
  @ApiBearerAuth() @UseGuards(JwtAuthGuard, RolesGuard) @Roles('SELLER')
  undoCancelSubscription(@CurrentUser() u: any) { return this.ss.undoCancelSubscription(u.id); }

  @Get()
  @ApiBearerAuth() @UseGuards(JwtAuthGuard, RolesGuard) @Roles('ADMIN', 'SUPER_ADMIN')
  getAll(@Query('page') p: number) { return this.ss.getAll(p); }

  // ── Admin : gestion des plans ────────────────────────────────────────────
  @Get('plans/admin')
  @ApiBearerAuth() @UseGuards(JwtAuthGuard, RolesGuard) @Roles('ADMIN', 'SUPER_ADMIN')
  getAllPlansAdmin() { return this.ss.getAllPlansAdmin(); }

  @Post('plans/admin')
  @ApiBearerAuth() @UseGuards(JwtAuthGuard, RolesGuard) @Roles('ADMIN', 'SUPER_ADMIN')
  createPlan(@Body() dto: any) { return this.ss.createPlan(dto); }

  @Patch('plans/admin/:id')
  @ApiBearerAuth() @UseGuards(JwtAuthGuard, RolesGuard) @Roles('ADMIN', 'SUPER_ADMIN')
  updatePlan(@Param('id') id: string, @Body() dto: any) { return this.ss.updatePlan(id, dto); }

  @Delete('plans/admin/:id')
  @ApiBearerAuth() @UseGuards(JwtAuthGuard, RolesGuard) @Roles('ADMIN', 'SUPER_ADMIN')
  deletePlan(@Param('id') id: string) { return this.ss.deletePlan(id); }
}
