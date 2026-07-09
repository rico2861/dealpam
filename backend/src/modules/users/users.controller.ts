import { Controller, Get, Patch, Delete, Post, Param, Body, Query, UseGuards, Request, BadRequestException } from '@nestjs/common';
import { IsString, MinLength, IsEmail } from 'class-validator';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { IsOptional, IsString, IsBoolean, MaxLength } from 'class-validator';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { RolesGuard } from '../../shared/guards/roles.guard';
import { Roles } from '../../shared/decorators/roles.decorator';
import { CurrentUser } from '../../shared/decorators/current-user.decorator';
import { Public } from '../../shared/decorators/public.decorator';
import { UsersService } from './users.service';

class CreateStaffDto {
  @IsString() @MinLength(1) firstName: string;
  @IsString() @MinLength(1) lastName:  string;
  @IsEmail()                email:     string;
  @IsString() @MinLength(6) password:  string;
  @IsString()               role:      string;
  @IsOptional() partnershipPercent?: number;
  @IsOptional() @IsString() responsibilities?: string;
  @IsOptional() @IsString() notes?: string;
}

class UpdateMeDto {
  @IsOptional() @IsString() @MaxLength(50) firstName?: string;
  @IsOptional() @IsString() @MaxLength(50) lastName?: string;
  @IsOptional() @IsString() @MaxLength(30) username?: string;
  @IsOptional() @IsString() @MaxLength(20) phone?: string;
  @IsOptional() @IsString() avatar?: string;
  @IsOptional() @IsString() @MaxLength(100) city?: string;
  @IsOptional() @IsString() @MaxLength(100) department?: string;
}

class AddressDto {
  @IsString() @MaxLength(60)  label:      string;
  @IsString() @MaxLength(100) fullName:   string;
  @IsString() @MaxLength(20)  phone:      string;
  @IsString() @MaxLength(200) line1:      string;
  @IsString() @MaxLength(100) city:       string;
  @IsString() @MaxLength(100) department: string;
  @IsOptional() @IsBoolean()  isDefault?: boolean;
}

class SaveLocationDto {
  @IsString() @MaxLength(100) department: string;
  @IsString() @MaxLength(100) city: string;
  @IsOptional() source?: 'manual' | 'gps';
  @IsOptional() lat?: number;
  @IsOptional() lng?: number;
}

@ApiTags('Users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(private us: UsersService) {}

  // ── Public profile (for chat header) ─────────────────────────────────────
  @Public()
  @Get(':id/mini-profile')
  @ApiOperation({ summary: 'Get basic user profile (firstName, lastName, avatar) — public' })
  async miniProfile(@Param('id') id: string) {
    const u = await this.us.findOne(id);
    return { id: u.id, firstName: (u as any).firstName, lastName: (u as any).lastName, avatar: (u as any).avatar };
  }

  // ── Self ──────────────────────────────────────────────────────────────────

  @Get('me')   getMe(@CurrentUser() u: any) { return this.us.findOne(u.id); }
  @Patch('me') updateMe(@CurrentUser() u: any, @Body() b: UpdateMeDto) { return this.us.update(u.id, b); }

  // ── Addresses ──────────────────────────────────────────────────────────────
  @Get('me/addresses')
  getAddresses(@CurrentUser() u: any) { return this.us.getAddresses(u.id); }

  @Post('me/addresses')
  addAddress(@CurrentUser() u: any, @Body() b: AddressDto) { return this.us.addAddress(u.id, b); }

  @Delete('me/addresses/:addressId')
  removeAddress(@CurrentUser() u: any, @Param('addressId') addressId: string) {
    return this.us.removeAddress(u.id, addressId);
  }

  @Patch('me/addresses/:addressId/default')
  setDefault(@CurrentUser() u: any, @Param('addressId') addressId: string) {
    return this.us.setDefaultAddress(u.id, addressId);
  }

  @Get('me/away-message')
  getAway(@CurrentUser() u: any) { return this.us.getAwayMessage(u.id); }

  @Patch('me/away-message')
  updateAway(@CurrentUser() u: any, @Body() b: { enabled: boolean; message?: string }) {
    return this.us.updateAwayMessage(u.id, b.enabled, b.message);
  }

  @Post('location')
  @ApiOperation({ summary: 'Sauvegarder la zone de livraison de l\'utilisateur' })
  saveLocation(@CurrentUser() u: any, @Body() b: SaveLocationDto) {
    return this.us.saveLocation(u.id, b);
  }

  @Get(':id/public-key')
  @Public()
  async getPublicKey(@Param('id') id: string) {
    const key = await this.us.getPublicKey(id);
    return { publicKey: key };
  }

  @Patch('me/public-key')
  async updatePublicKey(@Request() req: any, @Body('publicKey') publicKey: string) {
    return this.us.updatePublicKey(req.user.id, publicKey);
  }

  // ── Admin ─────────────────────────────────────────────────────────────────

  @Get()
  @UseGuards(RolesGuard) @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Admin: liste utilisateurs avec filtres' })
  @ApiQuery({ name: 'page',     required: false })
  @ApiQuery({ name: 'limit',    required: false })
  @ApiQuery({ name: 'role',     required: false })
  @ApiQuery({ name: 'active',   required: false })
  @ApiQuery({ name: 'search',   required: false })
  @ApiQuery({ name: 'dateFrom', required: false })
  @ApiQuery({ name: 'dateTo',   required: false })
  findAll(
    @Query('page')     page   = 1,
    @Query('limit')    limit  = 20,
    @Query('role')     role?: string,
    @Query('active')   active?: string,
    @Query('search')   search?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo')   dateTo?: string,
  ) {
    return this.us.findAll(+page, +limit, {
      role,
      isActive: active === undefined ? undefined : active === 'true',
      search,
      dateFrom,
      dateTo,
    });
  }

  @Get(':id')
  @UseGuards(RolesGuard) @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Admin: détail utilisateur complet' })
  findOne(@Param('id') id: string) { return this.us.findOne(id); }

  @Delete(':id')
  @UseGuards(RolesGuard) @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Admin: désactiver utilisateur' })
  disable(@Param('id') id: string) { return this.us.disable(id); }

  @Patch(':id/enable')
  @UseGuards(RolesGuard) @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Admin: réactiver utilisateur' })
  enable(@Param('id') id: string) { return this.us.enable(id); }

  @Patch(':id/unlock')
  @UseGuards(RolesGuard) @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Admin: déverrouiller compte bloqué' })
  unlock(@Param('id') id: string) { return this.us.unlock(id); }

  @Post(':id/reset-password')
  @UseGuards(RolesGuard) @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Admin: reset mot de passe (envoie email)' })
  adminResetPassword(@Param('id') id: string) { return this.us.adminResetPassword(id); }

  // ── Staff management ──────────────────────────────────────────────────────

  @Get('staff/list')
  @UseGuards(RolesGuard) @Roles('ADMIN', 'SUPER_ADMIN')
  listStaff() { return this.us.listStaff(); }

  @Post('staff')
  @UseGuards(RolesGuard) @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Admin: créer un compte staff (Customer Care, Partenaire, Comptable)' })
  createStaff(@Body() dto: CreateStaffDto) { return this.us.createStaff(dto); }

  @Post('staff/:id/reset-password')
  @UseGuards(RolesGuard) @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Admin: générer un mot de passe temporaire pour un staff (force changement à la connexion)' })
  resetStaffPassword(@Param('id') id: string) { return this.us.generateTempPassword(id); }

  @Patch('staff/:id/meta')
  @UseGuards(RolesGuard) @Roles('ADMIN', 'SUPER_ADMIN')
  updateStaffMeta(@Param('id') id: string, @Body() body: { partnershipPercent?: number; responsibilities?: string; notes?: string }) {
    return this.us.updateStaffMeta(id, body);
  }

  @Get('partner/stats')
  @UseGuards(RolesGuard) @Roles('PARTNER')
  getPartnerStats(@CurrentUser() u: any, @Query('period') period?: string) {
    return this.us.getPartnerStats(u.id, period ?? 'month');
  }
}
