import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { CurrentUser } from '../../shared/decorators/current-user.decorator';
import { CartService } from './cart.service';

class AddCartItemDto {
  @IsUUID() productId: string;
  @IsInt() @Min(1) @Max(100) @Type(() => Number) quantity: number;
  @IsOptional() @IsString() size?: string;
  @IsOptional() @IsString() color?: string;
}

class UpdateCartItemDto {
  @IsInt() @Min(0) @Max(100) @Type(() => Number) quantity: number;
}

@ApiTags('Cart')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('cart')
export class CartController {
  constructor(private cs: CartService) {}
  @Get() get(@CurrentUser() u: any) { return this.cs.getCart(u.id); }
  @Post('items') add(@CurrentUser() u: any, @Body() b: AddCartItemDto) { return this.cs.addItem(u.id, b.productId, b.quantity, b.size, b.color); }
  @Patch('items/:id') update(@CurrentUser() u: any, @Param('id') id: string, @Body() b: UpdateCartItemDto) { return this.cs.updateItem(u.id, id, b.quantity); }
  @Delete('items/:id') remove(@CurrentUser() u: any, @Param('id') id: string) { return this.cs.removeItem(u.id, id); }
  @Delete() clear(@CurrentUser() u: any) { return this.cs.clearCart(u.id); }
}
