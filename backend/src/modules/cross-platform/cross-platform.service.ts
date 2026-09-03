import { Injectable, Logger } from '@nestjs/common';
import * as crypto from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';

// Real-time, best-effort payment sharing between DealPam and PeguyTbn —
// two separate products run by the same owner, on different frameworks
// (this is NestJS/Prisma, PeguyTbn is plain Express). No shared database,
// no message queue: a signed HTTP POST fired the moment a payment settles
// on either side, read by the other purely for admin visibility — this
// never changes any DealPam plan/wallet/order state.
//
// Signing is over the SORTED-KEY JSON serialization of the payload object
// (mirrors the scheme in PeguyTbn's services/crossPlatform.js, and the
// existing NOWPayments IPN signature already used in this codebase) rather
// than raw request bytes, so no raw-body-capturing middleware is needed
// for this one endpoint.
@Injectable()
export class CrossPlatformService {
  private readonly logger = new Logger(CrossPlatformService.name);

  constructor(private prisma: PrismaService) {
    this.ensureTable().catch((err) =>
      this.logger.error(`Échec de création de la table cross_platform_payments: ${err.message}`),
    );
  }

  // Lightweight append-only log table, created via raw SQL rather than a
  // Prisma migration — this is a side-channel audit log, not a relational
  // entity the rest of the app queries/joins against, so it doesn't need
  // a schema.prisma model (same reasoning as PeguyTbn's own db.js, which
  // uses a matching CREATE TABLE IF NOT EXISTS for its jsonb-blob tables).
  private async ensureTable() {
    await this.prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS cross_platform_payments (
        id text PRIMARY KEY,
        data jsonb NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now()
      )
    `);
  }

  isConfigured(): boolean {
    return !!(process.env.CROSS_PLATFORM_WEBHOOK_SECRET && process.env.CROSS_PLATFORM_PEGUY_URL);
  }

  private canonicalSign(payload: Record<string, any>): string {
    const sortedJson = JSON.stringify(payload, Object.keys(payload).sort());
    return crypto.createHmac('sha256', process.env.CROSS_PLATFORM_WEBHOOK_SECRET as string).update(sortedJson).digest('hex');
  }

  verifySignature(body: Record<string, any>, signatureHeader?: string): boolean {
    if (!process.env.CROSS_PLATFORM_WEBHOOK_SECRET || !signatureHeader || !body || typeof body !== 'object') return false;
    const expected = this.canonicalSign(body);
    const a = Buffer.from(expected, 'hex');
    const b = Buffer.from(String(signatureHeader), 'hex');
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  }

  async store(body: Record<string, any>) {
    await this.ensureTable();
    const entry = { id: crypto.randomUUID(), receivedAt: new Date().toISOString(), ...body };
    await this.prisma.$executeRawUnsafe(
      'INSERT INTO cross_platform_payments (id, data) VALUES ($1, $2::jsonb)',
      entry.id,
      JSON.stringify(entry),
    );
  }

  async list(limit = 500) {
    await this.ensureTable();
    const rows = await this.prisma.$queryRawUnsafe<{ data: any }[]>(
      'SELECT data FROM cross_platform_payments ORDER BY created_at DESC LIMIT $1',
      limit,
    );
    return rows.map((r) => r.data);
  }

  // Fire-and-forget — a network hiccup or PeguyTbn being down must never
  // affect the DealPam payment flow this is attached to. Call this from
  // payments.service.ts wherever a payment/subscription/campaign/order
  // settles (success or failure).
  async notifyPeguy(payload: {
    referenceId: string;
    provider?: string | null;
    status: string;
    planType?: string | null;
    amountUsd?: number | null;
    amountHtg?: number | null;
    userName?: string | null;
    userEmail?: string | null;
    userPhone?: string | null;
  }) {
    if (!this.isConfigured()) return;
    const body = { source: 'dealpam', at: new Date().toISOString(), ...payload };
    try {
      const res = await fetch(`${(process.env.CROSS_PLATFORM_PEGUY_URL as string).replace(/\/$/, '')}/cross-platform/notify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-cross-signature': this.canonicalSign(body) },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(`PeguyTbn a répondu ${res.status}`);
    } catch (err: any) {
      this.logger.warn(`notify PeguyTbn failed: ${err.message}`);
    }
  }
}
