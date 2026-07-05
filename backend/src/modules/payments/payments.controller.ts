import {
  Controller, Get, Post, Body, Query, Param, UseGuards, BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { IsUUID, IsString, IsOptional, IsIn } from 'class-validator';
import { JwtAuthGuard }   from '../../shared/guards/jwt-auth.guard';
import { RolesGuard }     from '../../shared/guards/roles.guard';
import { Roles }          from '../../shared/decorators/roles.decorator';
import { CurrentUser }    from '../../shared/decorators/current-user.decorator';
import { PaymentsService } from './payments.service';

class InitiateSubDto {
  @IsUUID() planId: string;
  @IsOptional() @IsIn(['MONTHLY', 'ANNUAL']) billingCycle?: 'MONTHLY' | 'ANNUAL';
}
class InitiateAdDto     { @IsUUID() campaignId: string; }
class VerifyDto {
  @IsOptional() @IsString() transaction_id?: string;
  @IsOptional() @IsString() order_id?: string;
}

@ApiTags('Payments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('payments')
export class PaymentsController {
  constructor(private ps: PaymentsService) {}

  // ── Abonnement : initier le paiement MonCash ──────────────────────────────
  @Post('subscription/initiate')
  @ApiOperation({ summary: 'Vendeur — initie le paiement MonCash pour un abonnement' })
  initiateSubscription(@CurrentUser() u: any, @Body() dto: InitiateSubDto) {
    return this.ps.initiateSubscriptionPayment(u.id, dto.planId, dto.billingCycle || 'MONTHLY');
  }

  // ── Pub : initier le paiement MonCash pour une campagne ───────────────────
  @Post('ad-campaign/initiate')
  @ApiOperation({ summary: 'Vendeur — initie le paiement MonCash pour une campagne pub' })
  initiateAdCampaign(@CurrentUser() u: any, @Body() dto: InitiateAdDto) {
    return this.ps.initiateAdCampaignPayment(u.id, dto.campaignId);
  }

  // ── Vérification retour MonCash (vendeur) ─────────────────────────────────
  @Post('verify')
  @ApiOperation({
    summary: 'Vérifier un paiement MonCash vendeur après retour',
    description: 'Envoyer transaction_id (URL MonCash) OU order_id interne. Active automatiquement l\'abonnement ou la campagne.',
  })
  verify(@CurrentUser() u: any, @Body() dto: VerifyDto) {
    if (dto.transaction_id) return this.ps.verifySellerPayment(dto.transaction_id, u.id);
    if (dto.order_id)       return this.ps.verifyByOrderId(dto.order_id, u.id);
    throw new BadRequestException('Fournir transaction_id ou order_id');
  }

  // ── Historique paiements du vendeur ──────────────────────────────────────
  @Get('mine')
  @ApiOperation({ summary: 'Historique des paiements du vendeur connecté' })
  findMine(@CurrentUser() u: any, @Query('page') page: number) {
    return this.ps.findMine(u.id, page);
  }

  // ── Admin : tous les paiements ────────────────────────────────────────────
  @Get()
  @UseGuards(RolesGuard) @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Liste tous les paiements (admin)' })
  findAll(@Query('page') page: number) {
    return this.ps.findAll(page);
  }
}
