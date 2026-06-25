import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { CurrentUser } from '../../shared/decorators/current-user.decorator';
import { CartService } from './cart.service';

@ApiTags('Cart')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('cart')
export class CartController {
  constructor(private cs: CartService) {}
  @Get() get(@CurrentUser() u: any) { return this.cs.getCart(u.id); }
  @Post('items') add(@CurrentUser() u: any, @Body() b: any) { return this.cs.addItem(u.id, b.productId, b.quantity, b.size, b.color); }
  @Patch('items/:id') update(@CurrentUser() u: any, @Param('id') id: string, @Body('quantity') q: number) { return this.cs.updateItem(u.id, id, q); }
  @Delete('items/:id') remove(@CurrentUser() u: any, @Param('id') id: string) { return this.cs.removeItem(u.id, id); }
  @Delete() clear(@CurrentUser() u: any) { return this.cs.clearCart(u.id); }
}
