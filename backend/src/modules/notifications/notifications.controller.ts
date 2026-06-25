import { Controller, Get, Patch, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { CurrentUser } from '../../shared/decorators/current-user.decorator';
import { NotificationsService } from './notifications.service';

@ApiTags('Notifications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private ns: NotificationsService) {}
  @Get() getAll(@CurrentUser() u: any) { return this.ns.findMine(u.id); }
  @Patch(':id/read') markRead(@Param('id') id: string) { return this.ns.markRead(id); }
  @Patch('read-all') markAllRead(@CurrentUser() u: any) { return this.ns.markAllRead(u.id); }
}
