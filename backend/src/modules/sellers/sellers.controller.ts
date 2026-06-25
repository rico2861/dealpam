import { Controller, Get, Post, Param, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { RolesGuard } from '../../shared/guards/roles.guard';
import { Roles } from '../../shared/decorators/roles.decorator';
import { CurrentUser } from '../../shared/decorators/current-user.decorator';
import { SellersService } from './sellers.service';

@ApiTags('Sellers')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('sellers')
export class SellersController {
  constructor(private sellersService: SellersService) {}

  @Get('me') @Roles('SELLER') @UseGuards(RolesGuard)
  getMe(@CurrentUser() u: any) { return this.sellersService.getMe(u.id); }

  @Get() @Roles('ADMIN','SUPER_ADMIN','MODERATOR') @UseGuards(RolesGuard)
  findAll(@Query('status') status: string, @Query('page') page: number) { return this.sellersService.findAll(status, page); }

  @Post(':id/approve') @Roles('ADMIN','SUPER_ADMIN') @UseGuards(RolesGuard)
  approve(@Param('id') id: string, @CurrentUser() u: any) { return this.sellersService.approve(id, u.id); }

  @Post(':id/reject') @Roles('ADMIN','SUPER_ADMIN') @UseGuards(RolesGuard)
  reject(@Param('id') id: string, @Body('reason') reason: string) { return this.sellersService.reject(id, reason); }

  @Post(':id/suspend') @Roles('ADMIN','SUPER_ADMIN') @UseGuards(RolesGuard)
  suspend(@Param('id') id: string) { return this.sellersService.suspend(id); }

  @Post(':id/reactivate') @Roles('ADMIN','SUPER_ADMIN') @UseGuards(RolesGuard)
  reactivate(@Param('id') id: string) { return this.sellersService.reactivate(id); }
}
