import { Controller, Get, Post, Body, Query, UseGuards, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { RolesGuard }   from '../../shared/guards/roles.guard';
import { Roles }        from '../../shared/decorators/roles.decorator';
import { MoncashTransactionsService } from './moncash-transactions.service';

class LookupDto {
  @IsOptional() @IsString() transactionId?: string;
  @IsOptional() @IsString() orderId?: string;
}

@ApiTags('Admin — MonCash')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'SUPER_ADMIN')
@Controller('admin/moncash-transactions')
export class MoncashTransactionsController {
  constructor(private svc: MoncashTransactionsService) {}

  // ── Vérification live chez MonCash (jamais uniquement la DB) ─────────────
  @Post('lookup')
  @ApiOperation({ summary: "Vérifie en temps réel une transaction/commande directement chez MonCash" })
  lookup(@Body() dto: LookupDto) {
    if (!dto.transactionId && !dto.orderId) {
      throw new BadRequestException('Fournir transactionId ou orderId');
    }
    return this.svc.adminLookup(dto);
  }

  // ── Historique journalisé, filtrable ──────────────────────────────────────
  @Get()
  @ApiOperation({ summary: 'Liste les transactions MonCash journalisées (filtrable par statut/scénario)' })
  list(
    @Query('status') status?: string,
    @Query('scenario') scenario?: string,
    @Query('page') page?: string,
  ) {
    return this.svc.list({ status, scenario, page: page ? Number(page) : undefined });
  }
}
