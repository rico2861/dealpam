import {
  Controller, Get, Post, Patch, Body, Param, Delete,
  UseGuards, Request, UploadedFile, UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { RolesGuard } from '../../shared/guards/roles.guard';
import { Roles } from '../../shared/decorators/roles.decorator';
import { PlatformStoreService } from './platform-store.service';

@ApiTags('Platform Store (DealPam)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'SUPER_ADMIN')
@Controller('admin/platform-store')
export class PlatformStoreController {
  constructor(private readonly svc: PlatformStoreService) {}

  @Get()
  @ApiOperation({ summary: 'Get or create the DealPam official store' })
  getOrCreate(@Request() req: any) { return this.svc.getOrCreate(req.user.id); }

  @Patch()
  @ApiOperation({ summary: 'Update store settings (payment, delivery zones, pickup, moncashPhone, etc.)' })
  update(@Request() req: any, @Body() body: any) { return this.svc.update(req.user.id, body); }

  @Get('products')
  @ApiOperation({ summary: 'List products in DealPam store' })
  listProducts(@Request() req: any) { return this.svc.listProducts(req.user.id); }

  @Post('products')
  @ApiOperation({ summary: 'Add a product to DealPam store' })
  addProduct(@Request() req: any, @Body() body: any) { return this.svc.addProduct(req.user.id, body); }

  @Patch('products/:id')
  @ApiOperation({ summary: 'Edit a product in DealPam store' })
  editProduct(@Request() req: any, @Param('id') id: string, @Body() body: any) {
    return this.svc.editProduct(req.user.id, id, body);
  }

  @Delete('products/:id')
  @ApiOperation({ summary: 'Delete a product from DealPam store' })
  deleteProduct(@Request() req: any, @Param('id') id: string) {
    return this.svc.deleteProduct(req.user.id, id);
  }

  @Patch('products/:id/status')
  @ApiOperation({ summary: 'Publish or archive a product' })
  setStatus(@Request() req: any, @Param('id') id: string, @Body('status') status: string) {
    return this.svc.setStatus(req.user.id, id, status);
  }
}
