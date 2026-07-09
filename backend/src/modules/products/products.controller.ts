import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, UseInterceptors, UploadedFiles, Req, Res } from '@nestjs/common';
import { Response } from 'express';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { ApiTags, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { RolesGuard } from '../../shared/guards/roles.guard';
import { Roles } from '../../shared/decorators/roles.decorator';
import { CurrentUser } from '../../shared/decorators/current-user.decorator';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { FilterProductsDto } from './dto/filter-products.dto';

const MULTI_UPLOAD = FileFieldsInterceptor(
  [
    { name: 'images', maxCount: 10 },
    { name: 'variantImages', maxCount: 50 },
  ],
  { storage: memoryStorage() },
);

@ApiTags('Products')
@Controller('products')
export class ProductsController {
  constructor(private productsService: ProductsService) {}

  @Get()
  async findAll(@Query() filter: FilterProductsDto, @Res({ passthrough: true }) res: Response) {
    res.setHeader('Cache-Control', 'public, max-age=30, stale-while-revalidate=120');
    return this.productsService.findAll(filter);
  }

  @Get('featured')
  async getFeatured(@Res({ passthrough: true }) res: Response) {
    res.setHeader('Cache-Control', 'public, max-age=60, stale-while-revalidate=300');
    return this.productsService.getFeatured();
  }

  @Get('near')
  getNear(
    @Query('department') department: string,
    @Query('city') city: string,
    @Query('limit') limit = 20,
  ) {
    if (!department) return { products: [], level: 'national', label: 'Produits populaires en Haiti' };
    return this.productsService.getNearProducts(department, city || '', Number(limit));
  }

  // ── Intelligent recommendations ───────────────────────────────────────────
  @Get('recommendations')
  getRecommendations(
    @Query('productIds') productIds: string,   // comma-separated recently viewed IDs
    @Query('department') department: string,
    @Query('categoryId') categoryId: string,
    @Query('limit') limit = 16,
  ) {
    const ids = productIds ? productIds.split(',').filter(Boolean) : [];
    return this.productsService.getRecommendations({ ids, department, categoryId, limit: Number(limit) });
  }

  @Get('trending-categories')
  getTrendingCategories(@Query('department') department: string) {
    return this.productsService.getTrendingCategories(department);
  }

  @Get('personalized')
  getPersonalized(@Req() req: any, @Query('sessionId') sessionId: string, @Query('limit') limit = 12) {
    const userId = req.user?.id || null;
    const sid    = sessionId || req.headers['x-session-id'] || 'anon';
    return this.productsService.getPersonalized(userId, sid, Number(limit));
  }

  @Get('by-category/:slug')
  getByCategory(
    @Param('slug') slug: string,
    @Query('department') department: string,
    @Query('limit') limit = 12,
  ) {
    return this.productsService.findAll({ category: slug, department, limit: Number(limit), sort: 'popular' } as any);
  }

  @Get('me')
  @ApiBearerAuth() @UseGuards(JwtAuthGuard, RolesGuard) @Roles('SELLER')
  getMyProducts(
    @CurrentUser() user: any,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    return this.productsService.getMyProducts(user.id, Number(page), Number(limit), dateFrom, dateTo);
  }

  @Get('admin-list')
  @ApiBearerAuth() @UseGuards(JwtAuthGuard, RolesGuard) @Roles('ADMIN', 'SUPER_ADMIN')
  findAllAdmin(
    @Query('page') page = 1,
    @Query('limit') limit = 50,
    @Query('status') status?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    return this.productsService.findAllAdmin(Number(page), Number(limit), status, dateFrom, dateTo);
  }

  // Doit rester avant @Get(':slug') plus bas, sinon "me" serait capturé
  // comme un slug de produit. Utilisé par la page d'édition vendeur : findOne(:slug)
  // ne fonctionne pas pour l'édition car l'id du produit (uuid) n'est pas son slug —
  // ce mismatch causait un 404 silencieux et un spinner infini côté frontend.
  @Get('me/:id')
  @ApiBearerAuth() @UseGuards(JwtAuthGuard, RolesGuard) @Roles('SELLER')
  getMyProductById(@Param('id') id: string, @CurrentUser() user: any) {
    return this.productsService.getMyProductById(id, user.id);
  }

  @Get(':slug') findOne(@Param('slug') slug: string) { return this.productsService.findOne(slug); }

  @Post()
  @ApiBearerAuth() @UseGuards(JwtAuthGuard, RolesGuard) @Roles('SELLER')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(MULTI_UPLOAD)
  create(
    @CurrentUser() user: any,
    @Body() dto: CreateProductDto,
    @UploadedFiles() files: { images?: Express.Multer.File[]; variantImages?: Express.Multer.File[] },
  ) {
    return this.productsService.create(user.id, dto, files ?? {});
  }

  @Patch(':id')
  @ApiBearerAuth() @UseGuards(JwtAuthGuard, RolesGuard) @Roles('SELLER')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(MULTI_UPLOAD)
  update(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body() dto: UpdateProductDto,
    @UploadedFiles() files: { images?: Express.Multer.File[]; variantImages?: Express.Multer.File[] },
  ) {
    return this.productsService.update(id, user.id, dto, files ?? {});
  }

  @Post(':id/images')
  @ApiBearerAuth() @UseGuards(JwtAuthGuard, RolesGuard) @Roles('SELLER')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileFieldsInterceptor([{ name: 'images', maxCount: 10 }], { storage: memoryStorage() }))
  addImages(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @UploadedFiles() files: { images?: Express.Multer.File[] },
  ) {
    return this.productsService.addImages(id, user.id, files?.images ?? []);
  }

  @Delete('images/:imageId')
  @ApiBearerAuth() @UseGuards(JwtAuthGuard, RolesGuard) @Roles('SELLER')
  deleteImage(@Param('imageId') imageId: string, @CurrentUser() user: any) {
    return this.productsService.deleteImage(imageId, user.id);
  }

  @Delete('variants/:variantId')
  @ApiBearerAuth() @UseGuards(JwtAuthGuard, RolesGuard) @Roles('SELLER')
  deleteVariant(@Param('variantId') variantId: string, @CurrentUser() user: any) {
    return this.productsService.deleteVariant(variantId, user.id);
  }

  @Patch(':id/toggle-featured')
  @ApiBearerAuth() @UseGuards(JwtAuthGuard, RolesGuard) @Roles('ADMIN', 'SUPER_ADMIN')
  toggleFeatured(@Param('id') id: string) { return this.productsService.toggleFeatured(id); }

  @Patch(':id/toggle-sponsored')
  @ApiBearerAuth() @UseGuards(JwtAuthGuard, RolesGuard) @Roles('ADMIN', 'SUPER_ADMIN')
  toggleSponsored(@Param('id') id: string) { return this.productsService.toggleSponsored(id); }

  @Patch(':id/boost')
  @ApiBearerAuth() @UseGuards(JwtAuthGuard, RolesGuard) @Roles('ADMIN', 'SUPER_ADMIN')
  boostProduct(
    @Param('id') id: string,
    @Body() body: { days?: number; isSponsored?: boolean; isFeatured?: boolean },
  ) { return this.productsService.boostProduct(id, body); }

  @Post(':id/approve')
  @ApiBearerAuth() @UseGuards(JwtAuthGuard, RolesGuard) @Roles('ADMIN', 'SUPER_ADMIN', 'MODERATOR')
  approve(@Param('id') id: string, @CurrentUser() admin: any) { return this.productsService.approve(id, admin.id); }

  @Post(':id/reject')
  @ApiBearerAuth() @UseGuards(JwtAuthGuard, RolesGuard) @Roles('ADMIN', 'SUPER_ADMIN', 'MODERATOR')
  reject(@Param('id') id: string, @Body('reason') reason: string, @CurrentUser() admin: any) { return this.productsService.reject(id, reason, admin.id); }

  // ── Admin : historique complet des actions sur ce produit ─────────────────
  @Get(':id/audit-log')
  @ApiBearerAuth() @UseGuards(JwtAuthGuard, RolesGuard) @Roles('ADMIN', 'SUPER_ADMIN', 'MODERATOR')
  getAuditLog(@Param('id') id: string) { return this.productsService.getAuditLog(id); }

}
