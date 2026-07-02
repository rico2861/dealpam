import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards, Req, DefaultValuePipe, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { RolesGuard } from '../../shared/guards/roles.guard';
import { Roles } from '../../shared/decorators/roles.decorator';
import { ComplaintsService } from './complaints.service';
type ComplaintType = string;

@ApiTags('Complaints')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('complaints')
export class ComplaintsController {
  constructor(private svc: ComplaintsService) {}

  @Post()
  @ApiOperation({ summary: 'Déposer une plainte' })
  create(@Req() req: any, @Body() dto: { type: ComplaintType; subject: string; description: string; orderId?: string; sellerId?: string; productId?: string }) {
    return this.svc.create(req.user.id, dto);
  }

  @Get('mine')
  @ApiOperation({ summary: 'Mes plaintes' })
  mine(@Req() req: any) {
    return this.svc.findForUser(req.user.id);
  }

  @Get()
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN', 'MODERATOR')
  @ApiOperation({ summary: 'Toutes les plaintes (admin)' })
  findAll(@Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number, @Query('status') status?: string) {
    return this.svc.findAll(page, status);
  }

  @Patch(':id/resolve')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN', 'MODERATOR')
  @ApiOperation({ summary: 'Résoudre une plainte (admin)' })
  resolve(@Req() req: any, @Param('id') id: string, @Body() body: { status: string; adminNote: string }) {
    return this.svc.resolve(req.user.id, id, body.status, body.adminNote);
  }
}
