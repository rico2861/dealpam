import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { AppointmentsService } from './appointments.service';

@ApiTags('Appointments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('appointments')
export class AppointmentsController {
  constructor(private svc: AppointmentsService) {}

  @Post()
  @ApiOperation({ summary: 'Prendre un rendez-vous (véhicule, service…)' })
  create(@Req() req: any, @Body() dto: { productId: string; scheduledAt: string; note?: string }) {
    return this.svc.create(req.user.id, dto);
  }

  @Get('mine')
  @ApiOperation({ summary: 'Mes rendez-vous (client)' })
  myAppointments(@Req() req: any) {
    return this.svc.findForUser(req.user.id);
  }

  @Get('seller')
  @ApiOperation({ summary: 'Rendez-vous de ma boutique (vendeur)' })
  sellerAppointments(@Req() req: any) {
    return this.svc.findForSeller(req.user.seller?.id || req.user.id);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Confirmer/refuser un RDV (vendeur)' })
  updateStatus(@Req() req: any, @Param('id') id: string, @Body() body: { status: string; sellerNote?: string }) {
    return this.svc.updateStatus(req.user.seller?.id || req.user.id, id, body.status, body.sellerNote);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Annuler un rendez-vous (client)' })
  cancel(@Req() req: any, @Param('id') id: string) {
    return this.svc.cancel(req.user.id, id);
  }
}
