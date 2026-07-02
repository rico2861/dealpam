import { Controller, Get, Post, Patch, Param, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { RolesGuard } from '../../shared/guards/roles.guard';
import { Roles } from '../../shared/decorators/roles.decorator';
import { CurrentUser } from '../../shared/decorators/current-user.decorator';
import { OrdersService } from './orders.service';

@ApiTags('Orders')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('orders')
export class OrdersController {
  constructor(private os: OrdersService) {}

  @Post() create(@CurrentUser() u: any, @Body() b: any) {
    return this.os.create(u.id, b);
  }
  @Get('me') getMyOrders(@CurrentUser() u: any, @Query('page') p: number) { return this.os.findMyOrders(u.id, p); }
  @Get('me/:id') getOne(@CurrentUser() u: any, @Param('id') id: string) { return this.os.findOne(id, u.id); }

  @Post('me/:id/payment-tx')
  submitPaymentTx(@CurrentUser() u: any, @Param('id') id: string, @Body() b: any) {
    return this.os.submitPaymentTransaction(id, u.id, b.txRef, b.method);
  }

  @Get('admin/pending-payments')
  @UseGuards(RolesGuard) @Roles('ADMIN', 'SUPER_ADMIN')
  getPendingPayments(@Query('page') p: number) { return this.os.getPendingPayments(p); }

  @Patch('admin/:id/payment-tx')
  @UseGuards(RolesGuard) @Roles('ADMIN', 'SUPER_ADMIN')
  reviewPaymentTx(@Param('id') id: string, @CurrentUser() u: any, @Body() b: any) {
    return this.os.reviewPaymentTransaction(id, u.id, b.status, b.note);
  }

  @Get('seller') @UseGuards(RolesGuard) @Roles('SELLER')
  getSellerOrders(@CurrentUser() u: any, @Query('page') p: number) { return this.os.findSellerOrders(u.id, p); }

  @Patch('seller/:id/status') @UseGuards(RolesGuard) @Roles('SELLER')
  updateSellerOrder(@Param('id') id: string, @CurrentUser() u: any, @Body('status') s: string) { return this.os.updateStatus(id, s, u.id); }

  @Get() @UseGuards(RolesGuard) @Roles('ADMIN','SUPER_ADMIN')
  findAll(@Query('page') p: number) { return this.os.findAll(p); }

  @Patch(':id/status') @UseGuards(RolesGuard) @Roles('ADMIN','SUPER_ADMIN')
  updateStatus(@Param('id') id: string, @Body('status') s: string) { return this.os.updateStatus(id, s); }
}
