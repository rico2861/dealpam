import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, UseInterceptors, UploadedFiles, NotFoundException } from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { ApiTags, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { RolesGuard } from '../../shared/guards/roles.guard';
import { Roles } from '../../shared/decorators/roles.decorator';
import { CurrentUser } from '../../shared/decorators/current-user.decorator';
import { ProductsService } from './products.service';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { FilterProductsDto } from './dto/filter-products.dto';

@ApiTags('Products')
@Controller('products')
export class ProductsController {
  constructor(private productsService: ProductsService, private prisma: PrismaService) {}

  @Get() findAll(@Query() filter: FilterProductsDto) { return this.productsService.findAll(filter); }
  @Get('featured') getFeatured() { return this.productsService.getFeatured(); }

  @Get('me')
  @ApiBearerAuth() @UseGuards(JwtAuthGuard, RolesGuard) @Roles('SELLER')
  getMyProducts(@CurrentUser() user: any, @Query('page') page: number, @Query('limit') limit: number) {
    return this.productsService.getMyProducts(user.seller?.id || user.id, page, limit);
  }

  @Get(':slug') findOne(@Param('slug') slug: string) { return this.productsService.findOne(slug); }

  @Post()
  @ApiBearerAuth() @UseGuards(JwtAuthGuard, RolesGuard) @Roles('SELLER')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FilesInterceptor('images', 10, { storage: memoryStorage() }))
  async create(@CurrentUser() user: any, @Body() dto: CreateProductDto, @UploadedFiles() files: Express.Multer.File[]) {
    const seller = await this.getSeller(user.id);
    return this.productsService.create(seller.id, dto, files);
  }

  @Patch(':id')
  @ApiBearerAuth() @UseGuards(JwtAuthGuard, RolesGuard) @Roles('SELLER')
  async update(@Param('id') id: string, @CurrentUser() user: any, @Body() dto: UpdateProductDto) {
    const seller = await this.getSeller(user.id);
    return this.productsService.update(id, seller.id, dto);
  }

  @Post(':id/images')
  @ApiBearerAuth() @UseGuards(JwtAuthGuard, RolesGuard) @Roles('SELLER')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FilesInterceptor('images', 10, { storage: memoryStorage() }))
  async addImages(@Param('id') id: string, @CurrentUser() user: any, @UploadedFiles() files: Express.Multer.File[]) {
    const seller = await this.getSeller(user.id);
    return this.productsService.addImages(id, seller.id, files);
  }

  @Delete('images/:imageId')
  @ApiBearerAuth() @UseGuards(JwtAuthGuard, RolesGuard) @Roles('SELLER')
  async deleteImage(@Param('imageId') imageId: string, @CurrentUser() user: any) {
    const seller = await this.getSeller(user.id);
    return this.productsService.deleteImage(imageId, seller.id);
  }

  @Get('admin-list')
  @ApiBearerAuth() @UseGuards(JwtAuthGuard, RolesGuard) @Roles('ADMIN', 'SUPER_ADMIN')
  findAllAdmin(@Query('page') page = 1, @Query('limit') limit = 50) {
    return this.productsService.findAllAdmin(Number(page), Number(limit));
  }

  @Patch(':id/toggle-featured')
  @ApiBearerAuth() @UseGuards(JwtAuthGuard, RolesGuard) @Roles('ADMIN', 'SUPER_ADMIN')
  toggleFeatured(@Param('id') id: string) { return this.productsService.toggleFeatured(id); }

  @Patch(':id/toggle-sponsored')
  @ApiBearerAuth() @UseGuards(JwtAuthGuard, RolesGuard) @Roles('ADMIN', 'SUPER_ADMIN')
  toggleSponsored(@Param('id') id: string) { return this.productsService.toggleSponsored(id); }

  @Post(':id/approve')
  @ApiBearerAuth() @UseGuards(JwtAuthGuard, RolesGuard) @Roles('ADMIN', 'SUPER_ADMIN', 'MODERATOR')
  approve(@Param('id') id: string) { return this.productsService.approve(id); }

  @Post(':id/reject')
  @ApiBearerAuth() @UseGuards(JwtAuthGuard, RolesGuard) @Roles('ADMIN', 'SUPER_ADMIN', 'MODERATOR')
  reject(@Param('id') id: string, @Body('reason') reason: string) { return this.productsService.reject(id, reason); }

  private async getSeller(userId: string) {
    const seller = await this.prisma.seller.findUnique({ where: { userId } });
    if (!seller) throw new NotFoundException('Profil vendeur introuvable');
    return seller;
  }
}
