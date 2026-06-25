import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { RolesGuard } from '../../shared/guards/roles.guard';
import { Roles } from '../../shared/decorators/roles.decorator';
import { CurrentUser } from '../../shared/decorators/current-user.decorator';
import { SubscriptionsService } from './subscriptions.service';

// Le paiement des abonnements est géré par POST /payments/subscription/initiate
// Ce controller expose uniquement la lecture des plans et de l'abonnement actif

@ApiTags('Subscriptions')
@Controller('subscriptions')
export class SubscriptionsController {
  constructor(private ss: SubscriptionsService) {}

  @Get('plans')
  getPlans() { return this.ss.getPlans(); }

  @Get('me')
  @ApiBearerAuth() @UseGuards(JwtAuthGuard, RolesGuard) @Roles('SELLER')
  getMySubscription(@CurrentUser() u: any) { return this.ss.getMySubscription(u.id); }

  @Get()
  @ApiBearerAuth() @UseGuards(JwtAuthGuard, RolesGuard) @Roles('ADMIN', 'SUPER_ADMIN')
  getAll(@Query('page') p: number) { return this.ss.getAll(p); }
}
