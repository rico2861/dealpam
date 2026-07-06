import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../../../prisma/prisma.service';

// Cette stratégie s'exécute sur CHAQUE requête authentifiée de la plateforme
// (à peu près tout sauf les endpoints publics) — sans cache, ça veut dire un
// aller-retour DB par appel API rien que pour valider le token. Un petit cache
// mémoire à courte durée de vie élimine l'immense majorité de ces lectures
// redondantes (une page charge souvent 5-10 requêtes coup sur coup) tout en
// gardant un délai de réaction correct si un compte est désactivé/bloqué.
const USER_CACHE_TTL_MS = 20_000;
const userCache = new Map<string, { user: any; expiresAt: number }>();

setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of userCache) {
    if (entry.expiresAt <= now) userCache.delete(key);
  }
}, 60_000).unref();

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: process.env.JWT_SECRET,
    });
  }

  async validate(payload: any) {
    const cached = userCache.get(payload.sub);
    let user = cached && cached.expiresAt > Date.now() ? cached.user : null;

    if (!user) {
      user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
      if (user) userCache.set(payload.sub, { user, expiresAt: Date.now() + USER_CACHE_TTL_MS });
    }

    if (!user || !user.isActive) throw new UnauthorizedException('Compte inactif');
    if (user.lockedUntil && user.lockedUntil > new Date())
      throw new UnauthorizedException('Compte bloqué');
    if (payload.tv !== undefined && payload.tv !== user.tokenVersion)
      throw new UnauthorizedException('Session expirée');
    return user;
  }
}
