import { Injectable, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service';
import { MailService } from '../mail/mail.service';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService, private mail: MailService) {}

  findAll(page = 1) {
    return this.prisma.user.findMany({
      select: { id: true, email: true, firstName: true, lastName: true, role: true, isActive: true, createdAt: true },
      skip: (page - 1) * 20, take: 20, orderBy: { createdAt: 'desc' },
    });
  }

  findOne(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
      select: { id: true, email: true, firstName: true, lastName: true, role: true, phone: true, avatar: true, isActive: true, city: true, department: true, createdAt: true },
    });
  }

  update(id: string, data: any) {
    return this.prisma.user.update({
      where: { id }, data,
      select: { id: true, email: true, firstName: true, lastName: true, phone: true, avatar: true, city: true, department: true },
    });
  }

  disable(id: string) { return this.prisma.user.update({ where: { id }, data: { isActive: false } }); }
  enable(id: string)  { return this.prisma.user.update({ where: { id }, data: { isActive: true } }); }

  async adminResetPassword(userId: string): Promise<{ message: string }> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('Utilisateur introuvable');

    // Generate a readable temp password: 3 words + 4 digits
    const words = ['Deal', 'Pam', 'Mart', 'Shop', 'Haiti', 'Vente', 'Achat', 'Store'];
    const w = () => words[Math.floor(Math.random() * words.length)];
    const d = () => Math.floor(Math.random() * 9000 + 1000);
    const tempPassword = `${w()}${w()}${d()}`;

    const hash = await bcrypt.hash(tempPassword, 12);
    await this.prisma.user.update({ where: { id: userId }, data: { password: hash, mustChangePassword: true } });

    await this.mail.sendAdminPasswordReset(user.email, user.firstName, tempPassword);
    return { message: `Mot de passe temporaire envoyé à ${user.email}` };
  }
}
