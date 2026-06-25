import { Controller, Get, Patch, Param, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { RolesGuard } from '../../shared/guards/roles.guard';
import { Roles } from '../../shared/decorators/roles.decorator';
import { CurrentUser } from '../../shared/decorators/current-user.decorator';
import { StoresService } from './stores.service';

@ApiTags('Stores')
@Controller('stores')
export class StoresController {
  constructor(private storesService: StoresService) {}

  @Get() findAll(@Query('page') page: number) { return this.storesService.findAll(page); }
  @Get(':slug') findBySlug(@Param('slug') slug: string) { return this.storesService.findBySlug(slug); }

  @Patch('me')
  @ApiBearerAuth() @UseGuards(JwtAuthGuard, RolesGuard) @Roles('SELLER')
  updateMe(@CurrentUser() u: any, @Body() data: any) { return this.storesService.updateMe(u.id, data); }
}
