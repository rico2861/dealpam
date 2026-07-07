import { Controller, Get, Post, Delete, Param, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { RolesGuard } from '../../shared/guards/roles.guard';
import { Roles } from '../../shared/decorators/roles.decorator';
import { CurrentUser } from '../../shared/decorators/current-user.decorator';
import { ReviewsService, CreateReviewDto } from './reviews.service';

@ApiTags('Reviews')
@Controller('reviews')
export class ReviewsController {
  constructor(private rs: ReviewsService) {}
  @Get('product/:id') findByProduct(@Param('id') id: string) { return this.rs.findByProduct(id); }
  @Post() @ApiBearerAuth() @UseGuards(JwtAuthGuard) create(@CurrentUser() u: any, @Body() b: CreateReviewDto) { return this.rs.create(u.id, b); }
  @Post(':id/approve') @ApiBearerAuth() @UseGuards(JwtAuthGuard, RolesGuard) @Roles('ADMIN','SUPER_ADMIN','MODERATOR') approve(@Param('id') id: string) { return this.rs.approve(id); }
  @Delete(':id') @ApiBearerAuth() @UseGuards(JwtAuthGuard, RolesGuard) @Roles('ADMIN','SUPER_ADMIN') delete(@Param('id') id: string) { return this.rs.delete(id); }
  @Get() @ApiBearerAuth() @UseGuards(JwtAuthGuard, RolesGuard) @Roles('ADMIN','SUPER_ADMIN','MODERATOR') findAll(@Query('page') p: number) { return this.rs.findAll(p); }
}
