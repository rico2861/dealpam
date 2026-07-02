import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { randomBytes } from 'crypto';

@Injectable()
export class NewsletterService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
  ) {}

  async subscribe(email: string) {
    if (!email || !email.includes('@')) {
      throw new BadRequestException('Adresse email invalide');
    }

    const emailLower = email.toLowerCase().trim();

    const existing = await this.prisma.newsletterSubscriber.findUnique({
      where: { email: emailLower },
    });

    if (existing?.active) {
      return { message: 'Vous êtes déjà inscrit à la newsletter DealPam.' };
    }

    const token = randomBytes(32).toString('hex');

    if (existing) {
      await this.prisma.newsletterSubscriber.update({
        where: { email: emailLower },
        data: { active: true, token },
      });
    } else {
      await this.prisma.newsletterSubscriber.create({
        data: { email: emailLower, token },
      });
    }

    await this.mail.sendNewsletterWelcome(emailLower, token);
    return { message: 'Inscription réussie ! Consultez votre boîte mail.' };
  }

  async unsubscribe(token: string) {
    if (!token) throw new BadRequestException('Token manquant');

    const sub = await this.prisma.newsletterSubscriber.findUnique({ where: { token } });
    if (!sub) throw new BadRequestException('Lien invalide ou déjà utilisé.');

    await this.prisma.newsletterSubscriber.update({
      where: { token },
      data: { active: false },
    });

    return { message: 'Vous avez été désabonné avec succès.' };
  }
}
