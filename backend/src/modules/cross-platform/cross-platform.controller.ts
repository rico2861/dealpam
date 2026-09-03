import { Controller, Get, Post, Body, Headers, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { RolesGuard } from '../../shared/guards/roles.guard';
import { Roles } from '../../shared/decorators/roles.decorator';
import { CrossPlatformService } from './cross-platform.service';

@ApiTags('Cross-Platform')
@Controller('cross-platform')
export class CrossPlatformController {
  constructor(private cps: CrossPlatformService) {}

  // Inbound notification FROM PeguyTbn — public (no JWT: PeguyTbn's
  // backend calls this directly, no browser/session involved), secured
  // only by the HMAC signature — same trust model as the MonCash/NOWPayments
  // webhooks already handled in PaymentsController.
  @Post('notify')
  @ApiOperation({ summary: 'Webhook PeguyTbn — notification de paiement en temps réel' })
  async notify(@Body() body: any, @Headers('x-cross-signature') signature: string) {
    if (!this.cps.verifySignature(body, signature)) {
      return { ok: true }; // ack anyway, don't let it retry forever
    }
    await this.cps.store(body).catch(() => {});
    return { ok: true };
  }

  // Admin visibility into what PeguyTbn has reported — read-only.
  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Liste les transactions notifiées par les autres plateformes (admin)' })
  list() {
    return this.cps.list();
  }
}
