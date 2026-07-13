import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  private readonly logger = new Logger(PrismaService.name);

  async onModuleInit() {
    // Une perte de connexion (Supabase en veille/maintenance) faisait échouer la
    // première requête suivante avec une 500 générique, sans aucune trace dans
    // les logs indiquant que la cause était la base de données — un retry avec
    // backoff court ici couvre le cas le plus fréquent (DB pas encore réveillée
    // au tout premier appel) et logue explicitement si ça persiste.
    const maxAttempts = 5;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        await this.$connect();
        return;
      } catch (err) {
        if (attempt === maxAttempts) {
          this.logger.error(`Échec de connexion à la base de données après ${maxAttempts} tentatives`, err as Error);
          throw err;
        }
        this.logger.warn(`Connexion DB échouée (tentative ${attempt}/${maxAttempts}), nouvel essai dans ${attempt}s...`);
        await new Promise((r) => setTimeout(r, attempt * 1000));
      }
    }
  }
}
