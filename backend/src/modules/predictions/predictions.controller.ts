import {
  Controller, Get, Post, Patch, Delete, Body, Param, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { IsString, IsOptional, IsIn, IsNumber, Min, Max, IsDateString } from 'class-validator';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { RolesGuard } from '../../shared/guards/roles.guard';
import { Roles } from '../../shared/decorators/roles.decorator';
import { CurrentUser } from '../../shared/decorators/current-user.decorator';
import { PredictionsService } from './predictions.service';

class CreatePredictionDto {
  @IsString() competition: string;
  @IsString() homeTeam: string;
  @IsString() awayTeam: string;
  @IsDateString() matchDate: string;
  @IsString() market: string;
  @IsString() pick: string;
  @IsNumber() odds: number;
  @IsNumber() @Min(0) @Max(100) confidence: number;
  @IsOptional() @IsString() note?: string;
}

class UpdatePredictionDto {
  @IsOptional() @IsString() competition?: string;
  @IsOptional() @IsString() homeTeam?: string;
  @IsOptional() @IsString() awayTeam?: string;
  @IsOptional() @IsDateString() matchDate?: string;
  @IsOptional() @IsString() market?: string;
  @IsOptional() @IsString() pick?: string;
  @IsOptional() @IsNumber() odds?: number;
  @IsOptional() @IsNumber() @Min(0) @Max(100) confidence?: number;
  @IsOptional() @IsString() note?: string;
  @IsOptional() @IsIn(['PENDING', 'WON', 'LOST', 'VOID']) status?: 'PENDING' | 'WON' | 'LOST' | 'VOID';
}

@ApiTags('Predictions')
@ApiBearerAuth()
@Controller('predictions')
export class PredictionsController {
  constructor(private readonly predictions: PredictionsService) {}

  // ── Client — statut de son abonnement VIP ─────────────────────────────────
  @Get('vip-status')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Statut de l\'abonnement VIP pronostics du client connecté' })
  vipStatus(@CurrentUser() u: any) {
    return this.predictions.vipStatus(u.id);
  }

  // ── Client — liste des pronostics (masqués si non-VIP) ────────────────────
  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Liste des pronostics — détails complets si VIP actif, sinon masqués' })
  findAll(@CurrentUser() u: any) {
    return this.predictions.findAll(u.id);
  }

  // ── Admin — CRUD complet ───────────────────────────────────────────────────
  @Get('admin/all')
  @UseGuards(JwtAuthGuard, RolesGuard) @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Admin — liste tous les pronostics sans masquage' })
  findAllAdmin() {
    return this.predictions.findAllAdmin();
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard) @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Admin — publie un nouveau pronostic' })
  create(@CurrentUser() u: any, @Body() dto: CreatePredictionDto) {
    return this.predictions.create(u.id, dto);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard) @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Admin — modifie ou règle (WON/LOST/VOID) un pronostic' })
  update(@Param('id') id: string, @Body() dto: UpdatePredictionDto) {
    return this.predictions.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard) @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Admin — supprime un pronostic' })
  remove(@Param('id') id: string) {
    return this.predictions.remove(id);
  }
}
