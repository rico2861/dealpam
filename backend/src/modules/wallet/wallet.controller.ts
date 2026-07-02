import {
  Controller, Get, Post, Body, UseGuards, Req, HttpCode, HttpStatus,
} from '@nestjs/common';
import { IsNumber, IsString, Min, MaxLength } from 'class-validator';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { RolesGuard } from '../../shared/guards/roles.guard';
import { Roles } from '../../shared/decorators/roles.decorator';
import { WalletService } from './wallet.service';
import { PrismaService } from '../../prisma/prisma.service';

class InitRechargeDto {
  @IsNumber() @Min(100) amount: number;
}

class ConfirmRechargeDto {
  @IsString() @MaxLength(200) transactionId: string;
}

@Controller('wallet')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SELLER')
export class WalletController {
  constructor(
    private readonly walletService: WalletService,
    private readonly prisma: PrismaService,
  ) {}

  private async getSellerId(userId: string) {
    const seller = await this.prisma.seller.findUnique({ where: { userId } });
    if (!seller) throw new Error('Compte vendeur introuvable');
    return seller.id;
  }

  @Get()
  async getWallet(@Req() req: any) {
    const sellerId = await this.getSellerId(req.user.id);
    return this.walletService.getWallet(sellerId);
  }

  /** Initie une recharge MonCash — retourne l'URL de redirection */
  @Post('recharge/init')
  async initRecharge(@Req() req: any, @Body() body: InitRechargeDto) {
    const sellerId = await this.getSellerId(req.user.id);
    return this.walletService.initRecharge(sellerId, body.amount);
  }

  /** Confirme la recharge après retour MonCash — vérifie via l'API MonCash */
  @Post('recharge/confirm')
  @HttpCode(HttpStatus.OK)
  async confirmRecharge(@Req() req: any, @Body() body: ConfirmRechargeDto) {
    const sellerId = await this.getSellerId(req.user.id);
    return this.walletService.confirmRecharge(sellerId, body.transactionId);
  }
}
