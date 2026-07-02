import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { AppointmentsService } from './appointments.service';

@ApiTags('Appointments')
@Controller('appointments')
export class AppointmentsController {
  constructor(private svc: AppointmentsService) {}

  // ── Public: guest booking (no auth) ──────────────────────────────────────

  @Post('public')
  @ApiOperation({ summary: 'Prendre un RDV sans compte (invité)' })
  createPublic(@Body() dto: {
    productId: string; scheduledAt: string; note?: string;
    clientName: string; clientPhone: string; clientEmail?: string;
    serviceType?: string; duration?: number;
  }) {
    return this.svc.createPublic(dto);
  }

  // ── Authenticated endpoints ───────────────────────────────────────────────

  @Post()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Prendre un rendez-vous (connecté)' })
  create(@Req() req: any, @Body() dto: { productId: string; scheduledAt: string; note?: string; serviceType?: string; duration?: number }) {
    return this.svc.create(req.user.id, dto);
  }

  @Get('mine')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Mes rendez-vous (client)' })
  myAppointments(@Req() req: any) {
    return this.svc.findForUser(req.user.id);
  }

  @Get('seller')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Rendez-vous reçus (vendeur — toutes boutiques)' })
  sellerAppointments(@Req() req: any) {
    return this.svc.findForSeller(req.user.id);
  }

  @Patch(':id/status')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Confirmer/refuser un RDV (vendeur)' })
  updateStatus(@Req() req: any, @Param('id') id: string, @Body() body: { status: string; sellerNote?: string }) {
    return this.svc.updateStatus(req.user.id, id, body.status, body.sellerNote);
  }

  @Delete(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Annuler un rendez-vous (client)' })
  cancel(@Req() req: any, @Param('id') id: string) {
    return this.svc.cancel(req.user.id, id);
  }
}
