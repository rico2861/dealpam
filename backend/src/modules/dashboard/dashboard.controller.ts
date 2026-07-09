import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { RolesGuard } from '../../shared/guards/roles.guard';
import { Roles } from '../../shared/decorators/roles.decorator';
import { CurrentUser } from '../../shared/decorators/current-user.decorator';
import { DashboardService } from './dashboard.service';

@ApiTags('Dashboard')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('dashboard')
export class DashboardController {
  constructor(private ds: DashboardService) {}

  @Get('admin') @UseGuards(RolesGuard) @Roles('ADMIN','SUPER_ADMIN','MODERATOR')
  getAdminStats() { return this.ds.getAdminStats(); }

  @Get('seller') @UseGuards(RolesGuard) @Roles('SELLER')
  getSellerStats(@CurrentUser() u: any) { return this.ds.getSellerStats(u.id); }

  @Get('seller/statistics') @UseGuards(RolesGuard) @Roles('SELLER')
  getSellerStatistics(
    @CurrentUser() u: any,
    @Query('period') period: string = '30d',
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.ds.getSellerStatistics(u.id, period, from, to);
  }
}
