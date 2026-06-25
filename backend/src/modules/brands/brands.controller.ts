import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { RolesGuard } from '../../shared/guards/roles.guard';
import { Roles } from '../../shared/decorators/roles.decorator';
import { BrandsService } from './brands.service';

@ApiTags('Brands')
@Controller('brands')
export class BrandsController {
  constructor(private bs: BrandsService) {}
  @Get() findAll() { return this.bs.findAll(); }
  @Post() @ApiBearerAuth() @UseGuards(JwtAuthGuard, RolesGuard) @Roles('ADMIN','SUPER_ADMIN') create(@Body() b: any) { return this.bs.create(b); }
  @Patch(':id') @ApiBearerAuth() @UseGuards(JwtAuthGuard, RolesGuard) @Roles('ADMIN','SUPER_ADMIN') update(@Param('id') id: string, @Body() b: any) { return this.bs.update(id, b); }
  @Delete(':id') @ApiBearerAuth() @UseGuards(JwtAuthGuard, RolesGuard) @Roles('ADMIN','SUPER_ADMIN') remove(@Param('id') id: string) { return this.bs.remove(id); }
}
