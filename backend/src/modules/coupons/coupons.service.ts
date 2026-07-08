import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export type CouponContext = 'SUBSCRIPTION' | 'PLATFORM_PRODUCT';

@Injectable()
export class CouponsService {
  constructor(private prisma: PrismaService) {}

  // ── Admin : CRUD ─────────────────────────────────────────────────────────
  getAllAdmin() {
    return this.prisma.coupon.findMany({ orderBy: { createdAt: 'desc' } });
  }

  create(dto: any) {
    return this.prisma.coupon.create({
      data: {
        code:           dto.code.trim().toUpperCase(),
        description:    dto.description ?? null,
        discountType:   dto.discountType,
        discountValue:  dto.discountValue,
        appliesTo:      dto.appliesTo ?? 'BOTH',
        minAmountHTG:   dto.minAmountHTG ?? null,
        maxDiscountHTG: dto.maxDiscountHTG ?? null,
        maxUses:        dto.maxUses ?? null,
        maxUsesPerUser: dto.maxUsesPerUser ?? 1,
        startsAt:       dto.startsAt ? new Date(dto.startsAt) : null,
        endsAt:         dto.endsAt   ? new Date(dto.endsAt)   : null,
        isActive:       dto.isActive ?? true,
      },
    });
  }

  update(id: string, dto: any) {
    const data: any = {};
    for (const key of [
      'description', 'discountType', 'discountValue', 'appliesTo', 'minAmountHTG',
      'maxDiscountHTG', 'maxUses', 'maxUsesPerUser', 'isActive',
    ]) {
      if (dto[key] !== undefined) data[key] = dto[key];
    }
    if (dto.code     !== undefined) data.code    = dto.code.trim().toUpperCase();
    if (dto.startsAt !== undefined) data.startsAt = dto.startsAt ? new Date(dto.startsAt) : null;
    if (dto.endsAt   !== undefined) data.endsAt   = dto.endsAt   ? new Date(dto.endsAt)   : null;
    return this.prisma.coupon.update({ where: { id }, data });
  }

  remove(id: string) {
    return this.prisma.coupon.delete({ where: { id } });
  }

  // ── Validation + calcul de la réduction (sans redeem — appelé avant paiement) ──
  async validate(code: string, context: CouponContext, userId: string, amountHTG: number) {
    const coupon = await this.prisma.coupon.findUnique({ where: { code: code.trim().toUpperCase() } });
    if (!coupon || !coupon.isActive) throw new NotFoundException('Coupon invalide ou expiré');

    const now = new Date();
    if (coupon.startsAt && coupon.startsAt > now) throw new BadRequestException('Ce coupon n\'est pas encore actif');
    if (coupon.endsAt && coupon.endsAt < now)     throw new BadRequestException('Ce coupon a expiré');

    if (coupon.appliesTo !== 'BOTH' && coupon.appliesTo !== context) {
      throw new BadRequestException('Ce coupon n\'est pas valable pour ce type d\'achat');
    }

    if (coupon.maxUses !== null && coupon.usedCount >= coupon.maxUses) {
      throw new BadRequestException('Ce coupon a atteint sa limite d\'utilisation');
    }

    const userUses = await this.prisma.couponRedemption.count({ where: { couponId: coupon.id, userId } });
    if (userUses >= coupon.maxUsesPerUser) {
      throw new BadRequestException('Vous avez déjà utilisé ce coupon le nombre maximum de fois autorisé');
    }

    if (coupon.minAmountHTG && amountHTG < Number(coupon.minAmountHTG)) {
      throw new BadRequestException(`Montant minimum requis : ${Number(coupon.minAmountHTG).toLocaleString()} HTG`);
    }

    let discount = coupon.discountType === 'PERCENTAGE'
      ? amountHTG * (Number(coupon.discountValue) / 100)
      : Number(coupon.discountValue);
    if (coupon.maxDiscountHTG) discount = Math.min(discount, Number(coupon.maxDiscountHTG));
    discount = Math.min(discount, amountHTG); // jamais négatif

    return { coupon, discount: Math.round(discount) };
  }

  // ── Enregistre l'utilisation après paiement/commande confirmée ──────────
  async redeem(couponId: string, userId: string, context: CouponContext, referenceId: string, amountDiscounted: number) {
    await this.prisma.$transaction([
      this.prisma.coupon.update({ where: { id: couponId }, data: { usedCount: { increment: 1 } } }),
      this.prisma.couponRedemption.create({
        data: { couponId, userId, context, referenceId, amountDiscounted },
      }),
    ]);
  }
}
