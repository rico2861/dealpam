import {
  Controller, Get, Post, Body, Query, Param, UseGuards, BadRequestException, NotFoundException, Headers,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { IsUUID, IsString, IsOptional, IsIn } from 'class-validator';
import { JwtAuthGuard }   from '../../shared/guards/jwt-auth.guard';
import { RolesGuard }     from '../../shared/guards/roles.guard';
import { Roles }          from '../../shared/decorators/roles.decorator';
import { CurrentUser }    from '../../shared/decorators/current-user.decorator';
import { PaymentsService } from './payments.service';
import { CrossAppPaymentsService } from '../cross-app-payments/cross-app-payments.service';

// Apps externes utilisant DealPam comme page de retour MonCash partagée
// (voir cross-app-payments.service.ts) — le compte marchand MonCash étant
// partagé et son URL de retour fixe (impossible à faire varier par app),
// on ne peut pas router par URL : on tente d'abord la résolution DealPam
// normale, puis on retombe sur chacune de ces apps en fallback.
const CROSS_APP_FALLBACK_TAGS = ['peguytbn'];

class InitiateSubDto {
  @IsUUID() planId: string;
  @IsOptional() @IsIn(['MONTHLY', 'ANNUAL']) billingCycle?: 'MONTHLY' | 'ANNUAL';
  @IsOptional() @IsString() couponCode?: string;
}
class InitiateAdDto     { @IsUUID() campaignId: string; }
class InitiateOrderDto {
  @IsOptional() @IsUUID() addressId?: string;
  @IsOptional() @IsString() notes?: string;
  @IsOptional() @IsString() deliveryType?: string;
  @IsOptional() @IsString() pickupPointName?: string;
  @IsOptional() @IsString() pickupPointAddress?: string;
  @IsOptional() shippingCost?: number;
}
class VerifyDto {
  @IsOptional() @IsString() transaction_id?: string;
  @IsOptional() @IsString() order_id?: string;
}
@ApiTags('Payments')
@ApiBearerAuth()
@Controller('payments')
export class PaymentsController {
  constructor(private ps: PaymentsService, private crossApp: CrossAppPaymentsService) {}

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

  // ── Préchauffe le token MonCash (mis en cache 49s côté MoncashService) dès
  // que le client arrive à l'étape paiement — appelée en fire-and-forget par
  // le frontend, sans attendre sa réponse. Sans ça, le premier appel réel
  // (order/initiate, au clic sur "Payer") payait à la fois le coût du
  // /oauth/token ET du /CreatePayment en série, doublant la latence perçue
  // pile au moment où le client attend une redirection.
  @Post('moncash/warm')
  @ApiOperation({ summary: 'Préchauffe le cache du token MonCash (perf, pas de garantie de résultat)' })
  async warmMoncash() {
    try { await this.ps.warmMoncashToken(); } catch { /* best-effort, jamais bloquant */ }
    return { ok: true };
  }

  // ── Commande : initier le paiement MonCash (boutique DealPam Officiel uniquement) ──
  @Post('order/initiate')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Client — initie le paiement MonCash pour une commande DealPam Officiel' })
  initiateOrder(@CurrentUser() u: any, @Body() dto: InitiateOrderDto) {
    return this.ps.initiateOrderPayment(u.id, dto);
  }

  // ── Commande : initier le paiement crypto (NOWPayments, DealPam Officiel uniquement) ──
  @Post('order/initiate-crypto')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Client — initie le paiement crypto (NOWPayments) pour une commande DealPam Officiel' })
  initiateOrderCrypto(@CurrentUser() u: any, @Body() dto: InitiateOrderDto) {
    return this.ps.initiateOrderPaymentCrypto(u.id, dto);
  }

  // ── IPN NOWPayments — confirmation serveur-à-serveur du paiement crypto ───
  // PUBLIC (pas de JwtAuthGuard) comme le retour MonCash : la sécurité vient
  // uniquement de la signature HMAC (en-tête x-nowpayments-sig), jamais d'un
  // JWT — NOWPayments appelle cette route directement depuis ses serveurs,
  // sans navigateur ni session utilisateur.
  @Post('crypto/ipn')
  @ApiOperation({ summary: 'Webhook NOWPayments — confirmation de paiement crypto' })
  handleCryptoIpn(@Body() body: any, @Headers('x-nowpayments-sig') signature: string) {
    return this.ps.handleCryptoIpn(body, signature);
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
  async verify(@Body() dto: VerifyDto) {
    if (dto.transaction_id) {
      try {
        return await this.ps.verifySellerPayment(dto.transaction_id);
      } catch (err) {
        if (err instanceof NotFoundException) {
          const fallback = await this.tryCrossAppFallback(dto.transaction_id);
          if (fallback) return fallback;
        }
        throw err;
      }
    }
    if (dto.order_id) return this.ps.verifyByOrderId(dto.order_id);
    throw new BadRequestException('Fournir transaction_id ou order_id');
  }

  // Le compte marchand MonCash est partagé avec d'autres apps (ex.
  // PeguyTBN) et son URL de retour est fixe — impossible de router par URL
  // vers une page par app. Quand ce transactionId n'est trouvé dans AUCUNE
  // commande/abonnement/campagne DealPam, on essaie chaque app externe
  // enregistrée avant d'abandonner (voir CROSS_APP_FALLBACK_TAGS ci-dessus).
  private async tryCrossAppFallback(transactionId: string) {
    for (const appTag of CROSS_APP_FALLBACK_TAGS) {
      try {
        const result = await this.crossApp.verify(appTag, transactionId);
        return { type: 'external_app', ...result };
      } catch {
        // Ni une erreur "pas trouvé côté cette app" ni un pépin réseau ne
        // doivent bloquer l'essai de l'app suivante — on abandonne
        // seulement après avoir tenté toutes les apps connues.
      }
    }
    return null;
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
