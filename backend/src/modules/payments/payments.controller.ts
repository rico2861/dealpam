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
  @IsOptional() @IsString() couponCode?: string;
}
class InitiateAdDto     { @IsUUID() campaignId: string; }
class VerifyDto {
  @IsOptional() @IsString() transaction_id?: string;
  @IsOptional() @IsString() order_id?: string;
}

@ApiTags('Payments')
@ApiBearerAuth()
@Controller('payments')
export class PaymentsController {
  constructor(private ps: PaymentsService) {}

  // ── Abonnement : initier le paiement MonCash ──────────────────────────────
  @Post('subscription/initiate')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Vendeur — initie le paiement MonCash pour un abonnement' })
  initiateSubscription(@CurrentUser() u: any, @Body() dto: InitiateSubDto) {
    return this.ps.initiateSubscriptionPayment(u.id, dto.planId, dto.billingCycle || 'MONTHLY', dto.couponCode);
  }

  // ── Abonnement : payer directement avec le solde wallet ───────────────────
  @Post('subscription/pay-with-wallet')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Vendeur — paie un abonnement avec son solde wallet (sans MonCash)' })
  paySubscriptionWithWallet(@CurrentUser() u: any, @Body() dto: InitiateSubDto) {
    return this.ps.paySubscriptionWithWallet(u.id, dto.planId, dto.billingCycle || 'MONTHLY', dto.couponCode);
  }

  // ── Pub : initier le paiement MonCash pour une campagne ───────────────────
  @Post('ad-campaign/initiate')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Vendeur — initie le paiement MonCash pour une campagne pub' })
  initiateAdCampaign(@CurrentUser() u: any, @Body() dto: InitiateAdDto) {
    return this.ps.initiateAdCampaignPayment(u.id, dto.campaignId);
  }

  // ── Vérification retour MonCash (vendeur) ─────────────────────────────────
  // Volontairement PUBLIC (pas de JwtAuthGuard) : MonCash déconnecte parfois
  // le navigateur au retour (session/JWT expiré), et l'ancrage de sécurité
  // ici n'est de toute façon jamais le JWT de l'appelant — c'est la
  // confirmation server-to-server auprès de MonCash (transaction_id/reference)
  // qui fait foi. Exiger un JWT valide ne faisait que bloquer la vérification
  // et empêcher tout crédit après une session expirée.
  @Post('verify')
  @ApiOperation({
    summary: 'Vérifier un paiement MonCash vendeur après retour',
    description: 'Envoyer transaction_id (URL MonCash) OU order_id interne. Active automatiquement l\'abonnement ou la campagne.',
  })
  verify(@Body() dto: VerifyDto) {
    if (dto.transaction_id) return this.ps.verifySellerPayment(dto.transaction_id);
    if (dto.order_id)       return this.ps.verifyByOrderId(dto.order_id);
    throw new BadRequestException('Fournir transaction_id ou order_id');
  }

  // ── Historique paiements du vendeur ──────────────────────────────────────
  @Get('mine')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Historique des paiements du vendeur connecté' })
  findMine(@CurrentUser() u: any, @Query('page') page: number) {
    return this.ps.findMine(u.id, page);
  }

  // ── Admin : tous les paiements ────────────────────────────────────────────
  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard) @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Liste tous les paiements (admin)' })
  findAll(
    @Query('page') page: number,
    @Query('limit') limit: number,
    @Query('dateFrom') dateFrom: string,
    @Query('dateTo') dateTo: string,
  ) {
    return this.ps.findAll(page, limit, dateFrom, dateTo);
  }
}
