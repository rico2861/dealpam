import { Controller, Get, Patch, Delete, Post, Param, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { RolesGuard } from '../../shared/guards/roles.guard';
import { Roles } from '../../shared/decorators/roles.decorator';
import { CurrentUser } from '../../shared/decorators/current-user.decorator';
import { UsersService } from './users.service';

class UpdateMeDto {
  @IsOptional() @IsString() @MaxLength(50) firstName?: string;
  @IsOptional() @IsString() @MaxLength(50) lastName?: string;
  @IsOptional() @IsString() @MaxLength(20) phone?: string;
  @IsOptional() @IsString() avatar?: string;
  @IsOptional() @IsString() @MaxLength(100) city?: string;
  @IsOptional() @IsString() @MaxLength(100) department?: string;
}

@ApiTags('Users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(private us: UsersService) {}

  @Get('me')   getMe(@CurrentUser() u: any) { return this.us.findOne(u.id); }
  @Patch('me') updateMe(@CurrentUser() u: any, @Body() b: UpdateMeDto) { return this.us.update(u.id, b); }

  @Get()       @UseGuards(RolesGuard) @Roles('ADMIN','SUPER_ADMIN') findAll(@Query('page') p: number) { return this.us.findAll(p); }
  @Get(':id')  @UseGuards(RolesGuard) @Roles('ADMIN','SUPER_ADMIN') findOne(@Param('id') id: string) { return this.us.findOne(id); }
  @Delete(':id') @UseGuards(RolesGuard) @Roles('ADMIN','SUPER_ADMIN') disable(@Param('id') id: string) { return this.us.disable(id); }
  @Patch(':id/enable') @UseGuards(RolesGuard) @Roles('ADMIN','SUPER_ADMIN') enable(@Param('id') id: string) { return this.us.enable(id); }

  /** Admin reset — generates temp password & sends email */
  @Post(':id/reset-password') @UseGuards(RolesGuard) @Roles('ADMIN','SUPER_ADMIN')
  adminResetPassword(@Param('id') id: string) { return this.us.adminResetPassword(id); }
}
