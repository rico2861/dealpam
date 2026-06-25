import {
  Controller, Get, Post, Body, Query, UseGuards, BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard }   from '../../shared/guards/jwt-auth.guard';
import { RolesGuard }     from '../../shared/guards/roles.guard';
import { Roles }          from '../../shared/decorators/roles.decorator';
import { CurrentUser }    from '../../shared/decorators/current-user.decorator';
import { PaymentsService }     from './payments.service';
import { InitiatePaymentDto }  from './dto/initiate-payment.dto';
import { VerifyPaymentDto }    from './dto/verify-payment.dto';

@ApiTags('Payments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('payments')
export class PaymentsController {
  constructor(private ps: PaymentsService) {}

  // ── POST /payments/initiate ───────────────────────────────────────────────
  @Post('initiate')
  @ApiOperation({ summary: 'Crée un paiement MonCash pour une commande — retourne redirect_url' })
  initiate(@CurrentUser() u: any, @Body() dto: InitiatePaymentDto) {
    return this.ps.initiateOrderPayment(dto.orderId, u.id);
  }

  // ── POST /payments/verify ─────────────────────────────────────────────────
  @Post('verify')
  @ApiOperation({
    summary: 'Confirme un paiement MonCash après retour utilisateur',
    description:
      'Envoyer transaction_id (fourni par MonCash dans l\'URL) OU order_id interne.' +
      ' Le montant crédité vient toujours de MonCash — jamais du frontend.',
  })
  verify(@CurrentUser() u: any, @Body() dto: VerifyPaymentDto) {
    if (dto.transaction_id) return this.ps.verifyByTransactionId(dto.transaction_id, u.id);
    if (dto.order_id)       return this.ps.verifyByOrderId(dto.order_id, u.id);
    throw new BadRequestException('Fournir transaction_id ou order_id');
  }

  // ── GET /payments/mine ────────────────────────────────────────────────────
  @Get('mine')
  @ApiOperation({ summary: 'Historique des paiements de l\'utilisateur connecté' })
  findMine(@CurrentUser() u: any, @Query('page') page: number) {
    return this.ps.findMine(u.id, page);
  }

  // ── GET /payments (admin) ─────────────────────────────────────────────────
  @Get()
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Liste tous les paiements (admin)' })
  findAll(@Query('page') page: number) {
    return this.ps.findAll(page);
  }
}
