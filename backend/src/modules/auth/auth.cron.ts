import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AuthCron {
  private readonly logger = new Logger(AuthCron.name);

  constructor(private prisma: PrismaService) {}

  // Les refresh tokens consommés sont gardés (pas supprimés) le temps de
  // détecter une éventuelle réutilisation frauduleuse — purge nocturne de
  // ceux qui sont expirés pour éviter une croissance infinie de la table.
  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async purgeExpiredRefreshTokens() {
    const { count } = await this.prisma.refreshToken.deleteMany({
      where: { expiresAt: { lt: new Date() } },
    });
    if (count > 0) this.logger.log(`Purged ${count} expired refresh token(s).`);
  }
}
