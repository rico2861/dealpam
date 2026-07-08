import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { MoncashService, MoncashPayment } from '../moncash/moncash.service';

export type MoncashScenario = 'wallet' | 'subscription' | 'ad_campaign';

interface RecordParams {
  scenario: MoncashScenario;
  orderId?: string | null;
  mc?: MoncashPayment | null;
  status: 'SUCCESS' | 'FAILED' | 'UNKNOWN';
  failReason?: string | null;
}

/**
 * Journal + verrou anti-double-crédit centralisé pour toutes les vérifications
 * MonCash (wallet, abonnement, campagne pub). Chaque tentative — réussie ou
 * échouée — est enregistrée ici pour audit, indépendamment de la logique
 * métier propre à chaque scénario (qui garde ses propres tables Payment /
 * WalletTransaction pour l'activation réelle).
 */
@Injectable()
export class MoncashTransactionsService {
  constructor(
    private prisma: PrismaService,
    private moncash: MoncashService,
  ) {}

  /** Enregistre le résultat brut d'une vérification MonCash (idempotent par moncashTransactionId). */
  async record(params: RecordParams) {
    const moncashTransactionId = params.mc?.transaction_id ?? null;

    const data = {
      orderId:     params.orderId ?? params.mc?.reference ?? null,
      reference:   params.mc?.reference ?? null,
      amount:      params.mc?.cost !== undefined ? Number(params.mc.cost) : null,
      payer:       params.mc?.payer ?? null,
      status:      params.status,
      failReason:  params.failReason ?? null,
      scenario:    params.scenario,
      rawResponse: params.mc ? JSON.stringify(params.mc) : null,
    };

    if (moncashTransactionId) {
      return this.prisma.moncashTransaction.upsert({
        where:  { moncashTransactionId },
        create: { moncashTransactionId, ...data },
        update: data,
      });
    }
    // Pas de transaction_id (ex: 404 avant toute réponse MonCash exploitable) —
    // on garde quand même une trace de la tentative échouée.
    return this.prisma.moncashTransaction.create({ data });
  }

  /**
   * Verrou anti-double-crédit : ne renvoie true que pour LE PREMIER appelant.
   * Repose sur l'update conditionnel (credited: false → true) — atomique,
   * donc sûr même en cas d'appels concurrents sur la même transaction.
   */
  async claimCredit(moncashTransactionId: string): Promise<boolean> {
    const result = await this.prisma.moncashTransaction.updateMany({
      where: { moncashTransactionId, credited: false },
      data:  { credited: true },
    });
    return result.count > 0;
  }

  async isAlreadyCredited(moncashTransactionId: string): Promise<boolean> {
    const row = await this.prisma.moncashTransaction.findUnique({ where: { moncashTransactionId } });
    return !!row?.credited;
  }

  // ── Admin : recherche live chez MonCash (jamais uniquement la DB) ─────────
  async adminLookup(input: { transactionId?: string; orderId?: string }) {
    if (!input.transactionId && !input.orderId) {
      return { found: false, message: 'Fournir un transactionId ou un orderId' };
    }
    try {
      const mc = input.transactionId
        ? await this.moncash.verifyByTransactionId(input.transactionId)
        : await this.moncash.verifyByOrderId(input.orderId!);

      const raw = mc as any;
      const timeCandidate = raw.created_at ?? raw.timestamp ?? raw.date ?? null;
      const time = timeCandidate
        ? new Date(typeof timeCandidate === 'number' ? timeCandidate * (timeCandidate < 1e12 ? 1000 : 1) : timeCandidate).toISOString()
        : null;

      return {
        found:          true,
        transaction_id: mc.transaction_id,
        reference:      mc.reference,
        cost:           mc.cost,
        message:        mc.message,
        payer:          mc.payer,
        time,
        raw: mc,
      };
    } catch (err: any) {
      if (err instanceof NotFoundException) {
        return { found: false, message: "MonCash ne reconnaît pas cette transaction." };
      }
      return { found: false, message: err?.message ?? 'Erreur lors de la vérification MonCash' };
    }
  }

  // ── Admin : liste/filtre les transactions déjà journalisées ───────────────
  async list(params: { status?: string; scenario?: string; page?: number }) {
    const page = params.page && params.page > 0 ? params.page : 1;
    const where: any = {};
    if (params.status)   where.status = params.status;
    if (params.scenario) where.scenario = params.scenario;

    const [data, total] = await Promise.all([
      this.prisma.moncashTransaction.findMany({
        where, orderBy: { createdAt: 'desc' }, skip: (page - 1) * 30, take: 30,
      }),
      this.prisma.moncashTransaction.count({ where }),
    ]);
    return { data, total, page };
  }
}
