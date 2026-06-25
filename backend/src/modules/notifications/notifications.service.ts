import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class NotificationsService {
  constructor(private prisma: PrismaService) {}
  findMine(userId: string) { return this.prisma.notification.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take: 50 }); }
  markRead(id: string) { return this.prisma.notification.update({ where: { id }, data: { isRead: true } }); }
  markAllRead(userId: string) { return this.prisma.notification.updateMany({ where: { userId, isRead: false }, data: { isRead: true } }); }
  create(userId: string, title: string, body: string, type: string, data?: any) { return this.prisma.notification.create({ data: { userId, title, body, type, data } }); }
}
