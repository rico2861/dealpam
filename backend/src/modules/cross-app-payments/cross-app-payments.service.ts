import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { createHmac } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';

interface CrossAppEntry {
  apiUrl: string;
  signingSecret: string;
  homeUrl: string;
  appName: string;
}

interface ExternalConfirmResponse {
  status: 'success' | 'pending' | 'failed';
  appName?: string;
  planType?: string;
  amountHtg?: number;
  amountUsd?: number;
  customerName?: string;
  redirectUrl?: string;
  paymentId?: string;
}

export interface CrossAppVerifyResult {
  appTag: string;
  appName: string;
  status: 'PENDING' | 'CONFIRMED' | 'FAILED';
  planType?: string;
  amountHtg?: number;
  amountUsd?: number;
  customerName?: string;
  redirectUrl: string;
}

/**
 * DealPam sert de page de retour MonCash partagée pour d'autres applications
 * (ex. PeguyTBN) qui gardent leur propre compte marchand MonCash mais pointent
 * leur URL de retour ici. Ce service relaie la confirmation à l'app d'origine
 * (identifiée par appTag) via un appel serveur-à-serveur authentifié par
 * secret partagé, et journalise le résultat pour ne jamais retraiter deux
 * fois le même transactionId (bookmark, retour arrière, URL réutilisée).
 */
@Injectable()
export class CrossAppPaymentsService {
  private readonly logger = new Logger(CrossAppPaymentsService.name);
  private readonly registry: Record<string, CrossAppEntry>;

  constructor(private prisma: PrismaService) {
    this.registry = this.loadRegistry();
  }

  private loadRegistry(): Record<string, CrossAppEntry> {
    const raw = process.env.CROSS_APP_REGISTRY;
    if (!raw) return {};
    try {
      return JSON.parse(raw);
    } catch {
      this.logger.error('CROSS_APP_REGISTRY invalide (JSON malformé) — aucune app externe ne sera reconnue.');
      return {};
    }
  }

  private appOrThrow(appTag: string): CrossAppEntry {
    const app = this.registry[appTag];
    if (!app) throw new BadRequestException(`Application inconnue : ${appTag}`);
    return app;
  }

  async verify(appTag: string, transactionId: string): Promise<CrossAppVerifyResult> {
    const app = this.appOrThrow(appTag);

    // Chemin rapide idempotent : si ce transactionId a déjà été traité pour
    // cette app, on renvoie le résultat enregistré sans rappeler l'app externe
    // — empêche qu'une URL de retour réutilisée (bookmark, historique) ne
    // déclenche un nouveau crédit ou un nouvel accès VIP.
    const existing = await this.prisma.crossAppPayment.findUnique({
      where: { appTag_moncashTransactionId: { appTag, moncashTransactionId: transactionId } },
    });
    if (existing && existing.status !== 'PENDING') {
      return this.toResult(appTag, app, existing);
    }

    const row = existing ?? await this.prisma.crossAppPayment.upsert({
      where: { appTag_moncashTransactionId: { appTag, moncashTransactionId: transactionId } },
      create: { appTag, moncashTransactionId: transactionId, status: 'PENDING' },
      update: {},
    });

    let response: ExternalConfirmResponse;
    try {
      response = await this.callExternalConfirm(app, transactionId);
    } catch (err: any) {
      this.logger.error(`Échec confirmation externe (${appTag}/${transactionId}): ${err.message}`);
      // Erreur réseau/timeout : on ne fige pas le statut à FAILED (peut être
      // transitoire) — le frontend peut réessayer, ce qui retentera l'appel
      // externe tant que la ligne reste PENDING.
      throw new BadRequestException("Impossible de vérifier ce paiement pour l'instant, réessayez.");
    }

    const status = response.status === 'success' ? 'CONFIRMED' : response.status === 'pending' ? 'PENDING' : 'FAILED';
    const updated = await this.prisma.crossAppPayment.update({
      where: { id: row.id },
      data: {
        status,
        responsePayload: JSON.stringify(response),
        redirectUrl: response.redirectUrl ?? app.homeUrl,
      },
    });

    return this.toResult(appTag, app, updated);
  }

  // Même schéma de signature que le webhook cross-platform existant côté
  // PeguyTBN (HMAC-SHA256 sur le corps brut, secret partagé, comparaison
  // timing-safe côté receveur) — on réutilise le pattern déjà en place
  // plutôt que d'inventer un nouveau mécanisme d'auth serveur-à-serveur.
  private async callExternalConfirm(app: CrossAppEntry, transactionId: string): Promise<ExternalConfirmResponse> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10_000);
    const body = JSON.stringify({ transactionId });
    const signature = createHmac('sha256', app.signingSecret).update(body).digest('hex');
    try {
      const res = await fetch(`${app.apiUrl.replace(/\/$/, '')}/api/payments/external/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Cross-Signature': signature },
        body,
        signal: controller.signal,
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(`${app.apiUrl} a répondu ${res.status}: ${JSON.stringify(json).slice(0, 200)}`);
      return json;
    } finally {
      clearTimeout(timeout);
    }
  }

  private toResult(appTag: string, app: CrossAppEntry, row: { status: string; responsePayload: string | null; redirectUrl: string | null }): CrossAppVerifyResult {
    const payload: ExternalConfirmResponse = row.responsePayload ? JSON.parse(row.responsePayload) : {};
    return {
      appTag,
      appName: payload.appName || app.appName,
      status: row.status as any,
      planType: payload.planType,
      amountHtg: payload.amountHtg,
      amountUsd: payload.amountUsd,
      customerName: payload.customerName,
      redirectUrl: row.redirectUrl || app.homeUrl,
    };
  }
}
