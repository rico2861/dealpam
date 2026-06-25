import { Controller, Get, Post, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { RolesGuard } from '../../shared/guards/roles.guard';
import { Roles } from '../../shared/decorators/roles.decorator';
import { PaymentsService } from './payments.service';

@ApiTags('Payments')
@Controller('payments')
export class PaymentsController {
  constructor(private ps: PaymentsService) {}

  @Post('initiate') @ApiBearerAuth() @UseGuards(JwtAuthGuard)
  initiate(@Body() b: any) { return this.ps.initiate(b.orderId, b.method, b.amountHTG); }

  @Get() @ApiBearerAuth() @UseGuards(JwtAuthGuard, RolesGuard) @Roles('ADMIN','SUPER_ADMIN')
  findAll(@Query('page') p: number) { return this.ps.findAll(p); }
}
