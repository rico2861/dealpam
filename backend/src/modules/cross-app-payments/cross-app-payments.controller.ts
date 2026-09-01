import { Controller, Post, Body } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { IsString } from 'class-validator';
import { CrossAppPaymentsService } from './cross-app-payments.service';

class VerifyCrossAppDto {
  @IsString() appTag: string;
  @IsString() transactionId: string;
}

@ApiTags('CrossAppPayments')
@Controller('payments/cross-app')
export class CrossAppPaymentsController {
  constructor(private svc: CrossAppPaymentsService) {}

  // Volontairement PUBLIC (pas de JwtAuthGuard) : appelée par le navigateur
  // juste après le retour MonCash, souvent pour un utilisateur qui n'a pas
  // de session DealPam (c'est un client PeguyTBN, pas un client DealPam).
  // La sécurité vient du transactionId MonCash + du secret partagé entre
  // backends, jamais d'un JWT DealPam.
  @Post('verify')
  @ApiOperation({ summary: "Vérifie un paiement MonCash pour une app externe (ex. PeguyTBN) et relaie la confirmation" })
  verify(@Body() dto: VerifyCrossAppDto) {
    return this.svc.verify(dto.appTag, dto.transactionId);
  }
}
