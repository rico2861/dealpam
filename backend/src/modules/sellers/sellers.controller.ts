import {
  Controller, Get, Post, Patch, Param, Body, Query,
  UseGuards, UseInterceptors, UploadedFile, BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { ApiTags, ApiBearerAuth, ApiConsumes, ApiOperation } from '@nestjs/swagger';
import { IsString, IsEnum, IsOptional, IsBoolean, IsNotEmpty, MaxLength } from 'class-validator';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { RolesGuard } from '../../shared/guards/roles.guard';
import { Roles } from '../../shared/decorators/roles.decorator';
import { CurrentUser } from '../../shared/decorators/current-user.decorator';
import { Public } from '../../shared/decorators/public.decorator';
import { SellersService } from './sellers.service';

const DOC_TYPES = ['PATENTE', 'IDENTITY', 'SELFIE', 'BUSINESS_REGISTRATION', 'TAX', 'LEGAL', 'OTHER'] as const;

class UploadDocDto {
  @IsEnum(DOC_TYPES)
  type: string;

  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;
}

class UpdateDocVisibilityDto {
  @IsBoolean()
  isPublic: boolean;
}

class BecomeSellerDto {
  @IsString() @IsNotEmpty() @MaxLength(80)
  storeName: string;

  @IsString() @IsOptional() @MaxLength(500)
  storeDescription?: string;

  @IsString() @IsOptional() @MaxLength(30)
  nif?: string;
}

@ApiTags('Sellers')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('sellers')
export class SellersController {
  constructor(private sellersService: SellersService) {}

  // ── Public: featured sellers ──────────────────────────────────────────────

  @Get('featured')
  @Public()
  @ApiOperation({ summary: 'Vendeurs premium mis en avant (ELITE > BUSINESS > STARTER)' })
  getFeatured(@Query('limit') limit?: string, @Query('department') department?: string) {
    return this.sellersService.getFeatured(limit ? Math.min(parseInt(limit), 30) : 20, department);
  }

  // ── Buyer → Seller conversion ─────────────────────────────────────────────

  @Post('become')
  @ApiOperation({ summary: 'Convert buyer account to seller' })
  becomeSeller(@CurrentUser() u: any, @Body() dto: BecomeSellerDto) {
    return this.sellersService.becomeSeller(u.id, dto.storeName, dto.storeDescription, dto.nif);
  }

  // ── Seller self ───────────────────────────────────────────────────────────

  @Get('me')
  @Roles('SELLER') @UseGuards(RolesGuard)
  getMe(@CurrentUser() u: any) { return this.sellersService.getMe(u.id); }

  // ── Document management ───────────────────────────────────────────────────

  @Get('me/documents')
  @Roles('SELLER') @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Lister mes documents (publics + privés)' })
  getMyDocuments(@CurrentUser() u: any) { return this.sellersService.getMyDocuments(u.id); }

  @Post('me/documents')
  @Roles('SELLER') @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Uploader un document (patente, identité, etc.)' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file', {
    storage: memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
      const allowed = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
      if (allowed.includes(file.mimetype)) cb(null, true);
      else cb(new BadRequestException('Seuls PDF et images sont acceptés'), false);
    },
  }))
  uploadDocument(
    @CurrentUser() u: any,
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: UploadDocDto,
  ) {
    if (!file) throw new BadRequestException('Fichier manquant');
    return this.sellersService.uploadDocument(u.id, file, dto.type, dto.isPublic ?? false);
  }

  @Patch('me/documents/:docId/visibility')
  @Roles('SELLER') @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Changer la visibilité d\'un document (public/privé)' })
  updateDocVisibility(
    @CurrentUser() u: any,
    @Param('docId') docId: string,
    @Body() dto: UpdateDocVisibilityDto,
  ) {
    return this.sellersService.updateDocumentVisibility(u.id, docId, dto.isPublic);
  }

  @Get('me/documents/:docId/view')
  @Roles('SELLER') @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Obtenir une URL signée (5 min) pour consulter mon document' })
  viewMyDocument(@CurrentUser() u: any, @Param('docId') docId: string) {
    return this.sellersService.getMyDocumentUrl(u.id, docId);
  }

  // ── Seller profile update ─────────────────────────────────────────────────

  @Patch('me/profile')
  @Roles('SELLER') @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Mettre à jour le profil vendeur (info métier)' })
  updateProfile(
    @CurrentUser() u: any,
    @Body() data: { businessType?: string; businessCity?: string; businessDept?: string; businessAddress?: string },
  ) {
    return this.sellersService.updateProfile(u.id, data);
  }

  // ── Admin ─────────────────────────────────────────────────────────────────

  @Get(':id')
  @Roles('ADMIN', 'SUPER_ADMIN', 'MODERATOR') @UseGuards(RolesGuard)
  findOne(@Param('id') id: string) { return this.sellersService.findOne(id); }

  @Get()
  @Roles('ADMIN', 'SUPER_ADMIN', 'MODERATOR') @UseGuards(RolesGuard)
  findAll(
    @Query('status')   status: string,
    @Query('page')     page = 1,
    @Query('limit')    limit = 20,
    @Query('search')   search?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo')   dateTo?: string,
  ) { return this.sellersService.findAll(status, +page, +limit, search, dateFrom, dateTo); }

  @Post(':id/approve') @Roles('ADMIN', 'SUPER_ADMIN') @UseGuards(RolesGuard)
  approve(@Param('id') id: string, @CurrentUser() u: any) { return this.sellersService.approve(id, u.id); }

  @Post(':id/reject') @Roles('ADMIN', 'SUPER_ADMIN') @UseGuards(RolesGuard)
  reject(@Param('id') id: string, @Body('reason') reason: string) { return this.sellersService.reject(id, reason); }

  @Post(':id/suspend') @Roles('ADMIN', 'SUPER_ADMIN') @UseGuards(RolesGuard)
  suspend(@Param('id') id: string) { return this.sellersService.suspend(id); }

  @Post(':id/reactivate') @Roles('ADMIN', 'SUPER_ADMIN') @UseGuards(RolesGuard)
  reactivate(@Param('id') id: string) { return this.sellersService.reactivate(id); }

  // Admin: obtenir une URL signée (5 min) pour consulter un document vendeur
  @Get(':sellerId/documents/:docId/view')
  @Roles('ADMIN', 'SUPER_ADMIN', 'MODERATOR') @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Admin: consulter un document vendeur (URL signée temporaire)' })
  viewSellerDocument(@Param('sellerId') sellerId: string, @Param('docId') docId: string) {
    return this.sellersService.getAdminDocumentUrl(sellerId, docId);
  }

  // Admin: validate/invalidate a document
  @Patch(':sellerId/documents/:docId/validate')
  @Roles('ADMIN', 'SUPER_ADMIN') @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Admin: valider ou invalider un document vendeur' })
  validateDocument(
    @Param('sellerId') sellerId: string,
    @Param('docId') docId: string,
    @Body('isValid') isValid: boolean,
  ) {
    return this.sellersService.adminValidateDocument(sellerId, docId, isValid);
  }

  // Admin: forcer le badge vérifié manuellement
  @Patch(':id/verify')
  @Roles('ADMIN', 'SUPER_ADMIN') @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Admin: activer/désactiver le badge Vérifié manuellement' })
  setVerified(@Param('id') id: string, @Body('isVerified') isVerified: boolean) {
    return this.sellersService.adminSetVerified(id, isVerified);
  }
}
