import { Controller, Get, Post, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { CurrentUser } from '../../shared/decorators/current-user.decorator';
import { WishlistService } from './wishlist.service';

@ApiTags('Wishlist')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('wishlist')
export class WishlistController {
  constructor(private svc: WishlistService) {}

  @Get()
  get(@CurrentUser() u: any) { return this.svc.getWishlist(u.id); }

  @Get('count')
  count(@CurrentUser() u: any) { return this.svc.getCount(u.id); }

  @Post()
  add(@CurrentUser() u: any, @Body('productId') productId: string) {
    return this.svc.addToWishlist(u.id, productId);
  }

  @Get('check/:productId')
  check(@CurrentUser() u: any, @Param('productId') productId: string) {
    return this.svc.isInWishlist(u.id, productId);
  }

  @Delete(':productId')
  remove(@CurrentUser() u: any, @Param('productId') productId: string) {
    return this.svc.removeFromWishlist(u.id, productId);
  }

  @Delete()
  clear(@CurrentUser() u: any) { return this.svc.clearWishlist(u.id); }
}
