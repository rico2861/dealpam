import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Decimal } from '@prisma/client/runtime/library';

// ─────────────────────────────────────────────────────────────────────────────
// Pronostics VIP — publiés par un admin/super admin, réservés aux clients dont
// l'abonnement VIP (VipSubscription) est ACTIVE et non expiré. Un non-VIP
// reçoit la même liste mais avec les champs à valeur ("pick", "odds",
// "confidence", "note") masqués — jamais l'accès complet.
// ─────────────────────────────────────────────────────────────────────────────

@Injectable()
export class PredictionsService {
  constructor(private prisma: PrismaService) {}

  async isVipActive(userId: string): Promise<boolean> {
    const vip = await this.prisma.vipSubscription.findFirst({
      where: { userId, status: 'ACTIVE', endDate: { gt: new Date() } },
    });
    return !!vip;
  }

  async vipStatus(userId: string) {
    const vip = await this.prisma.vipSubscription.findFirst({
      where: { userId, status: 'ACTIVE' },
      orderBy: { endDate: 'desc' },
    });
    const active = !!vip?.endDate && vip.endDate > new Date();
    return { active, endDate: vip?.endDate ?? null };
  }

  async findAll(userId: string) {
    const active = await this.isVipActive(userId);
    const predictions = await this.prisma.prediction.findMany({
      orderBy: { matchDate: 'desc' },
      take: 100,
    });

    if (active) return predictions.map(p => ({ ...p, locked: false }));

    return predictions.map(p => ({
      id: p.id,
      competition: p.competition,
      homeTeam: p.homeTeam,
      awayTeam: p.awayTeam,
      matchDate: p.matchDate,
      status: p.status,
      locked: true,
    }));
  }

  // ── Admin — CRUD complet, jamais de masquage ──────────────────────────────
  findAllAdmin() {
    return this.prisma.prediction.findMany({
      orderBy: { matchDate: 'desc' },
      include: { createdBy: { select: { firstName: true, lastName: true } } },
    });
  }

  create(createdById: string, dto: {
    competition: string; homeTeam: string; awayTeam: string; matchDate: string;
    market: string; pick: string; odds: number; confidence: number; note?: string;
  }) {
    return this.prisma.prediction.create({
      data: {
        competition: dto.competition,
        homeTeam: dto.homeTeam,
        awayTeam: dto.awayTeam,
        matchDate: new Date(dto.matchDate),
        market: dto.market,
        pick: dto.pick,
        odds: new Decimal(dto.odds),
        confidence: dto.confidence,
        note: dto.note,
        createdById,
      },
    });
  }

  async update(id: string, dto: Partial<{
    competition: string; homeTeam: string; awayTeam: string; matchDate: string;
    market: string; pick: string; odds: number; confidence: number; note?: string;
    status: 'PENDING' | 'WON' | 'LOST' | 'VOID';
  }>) {
    const existing = await this.prisma.prediction.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Pronostic introuvable');

    return this.prisma.prediction.update({
      where: { id },
      data: {
        ...(dto.competition !== undefined && { competition: dto.competition }),
        ...(dto.homeTeam !== undefined && { homeTeam: dto.homeTeam }),
        ...(dto.awayTeam !== undefined && { awayTeam: dto.awayTeam }),
        ...(dto.matchDate !== undefined && { matchDate: new Date(dto.matchDate) }),
        ...(dto.market !== undefined && { market: dto.market }),
        ...(dto.pick !== undefined && { pick: dto.pick }),
        ...(dto.odds !== undefined && { odds: new Decimal(dto.odds) }),
        ...(dto.confidence !== undefined && { confidence: dto.confidence }),
        ...(dto.note !== undefined && { note: dto.note }),
        ...(dto.status !== undefined && { status: dto.status }),
      },
    });
  }

  async remove(id: string) {
    const existing = await this.prisma.prediction.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Pronostic introuvable');
    await this.prisma.prediction.delete({ where: { id } });
    return { ok: true };
  }
}
