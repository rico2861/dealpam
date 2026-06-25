import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ComplaintType } from '@prisma/client';

@Injectable()
export class ComplaintsService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, dto: { type: ComplaintType; subject: string; description: string; orderId?: string; sellerId?: string; productId?: string }) {
    return this.prisma.complaint.create({
      data: { userId, ...dto },
      include: { user: { select: { id: true, firstName: true, lastName: true, email: true } } },
    });
  }

  async findForUser(userId: string) {
    return this.prisma.complaint.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findAll(page = 1, status?: string) {
    const where = status ? { status: status as any } : {};
    const [data, total] = await Promise.all([
      this.prisma.complaint.findMany({
        where,
        include: { user: { select: { id: true, firstName: true, lastName: true, email: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * 20,
        take: 20,
      }),
      this.prisma.complaint.count({ where }),
    ]);
    return { data, total, page, totalPages: Math.ceil(total / 20) };
  }

  async resolve(adminId: string, id: string, status: string, adminNote: string) {
    const complaint = await this.prisma.complaint.findUnique({ where: { id } });
    if (!complaint) throw new NotFoundException('Plainte introuvable');
    return this.prisma.complaint.update({
      where: { id },
      data: { status: status as any, adminNote, resolvedBy: adminId, resolvedAt: status !== 'OPEN' ? new Date() : null },
    });
  }
}
