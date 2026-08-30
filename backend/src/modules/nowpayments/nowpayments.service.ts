import { Injectable, Logger, BadGatewayException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac } from 'crypto';

export interface NowPaymentsInvoice {
  id: string;           // NOWPayments' own payment/invoice id — à conserver pour retrouver le paiement à l'IPN
  invoice_url: string;  // page de paiement hébergée à laquelle on redirige le client
}

// payment_status possibles renvoyés par NOWPayments (création + IPN) :
// waiting -> confirming -> confirmed -> sending -> finished (succès)
//                                                -> partially_paid / failed / expired / refunded
export type NowPaymentsStatus =
  | 'waiting' | 'confirming' | 'confirmed' | 'sending'
  | 'partially_paid' | 'finished' | 'failed' | 'expired' | 'refunded';

export interface NowPaymentsIpnPayload {
  payment_id: string | number;
  payment_status: NowPaymentsStatus;
  price_amount: number;
  price_currency: string;
  pay_amount: number;
  actually_paid: number;
  pay_currency: string;
  order_id: string;
  order_description?: string;
  [key: string]: any;
}

@Injectable()
export class NowPaymentsService {
  private readonly logger = new Logger(NowPaymentsService.name);
  private readonly apiHost = 'https://api.nowpayments.io/v1';
  private readonly apiKey: string;
  private readonly ipnSecret: string;

  private static readonly FETCH_TIMEOUT_MS = 8000;

  constructor(private config: ConfigService) {
    this.apiKey    = this.config.get<string>('NOWPAYMENTS_API_KEY', '');
    this.ipnSecret = this.config.get<string>('NOWPAYMENTS_IPN_SECRET', '');
  }

  private async fetchWithTimeout(url: string, options: RequestInit): Promise<Response> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), NowPaymentsService.FETCH_TIMEOUT_MS);
    try {
      return await fetch(url, { ...options, signal: controller.signal });
    } catch (err: any) {
      if (err?.name === 'AbortError') throw new BadGatewayException('NOWPayments ne répond pas (timeout)');
      throw err;
    } finally {
      clearTimeout(timer);
    }
  }

  // ── Créer une facture (page de paiement hébergée) ────────────────────────
  // /invoice (plutôt que /payment) : le client paie sur une page NOWPayments
  // qui gère elle-même le choix de la crypto, le taux, le QR code — on n'a
  // rien à construire côté front, exactement le niveau de "simple" demandé.
  async createInvoice(params: {
    amountHTG: number;
    orderId: string;          // notre référence interne (ex: cryptopay-<paymentId>)
    description?: string;
    ipnCallbackUrl: string;
    successUrl?: string;
    cancelUrl?: string;
  }): Promise<NowPaymentsInvoice> {
    // NOWPayments ne connaît pas le HTG (gourde haïtienne) comme devise de
    // facturation — on facture en USD, NOWPayments affiche ensuite au client
    // l'équivalent dans la crypto choisie à son propre taux du marché.
    // Le taux HTG→USD doit être fourni par l'appelant (voir PaymentsService).
    const res = await this.fetchWithTimeout(`${this.apiHost}/invoice`, {
      method: 'POST',
      headers: {
        'x-api-key':     this.apiKey,
        'Content-Type':  'application/json',
      },
      body: JSON.stringify({
        price_amount:       params.amountHTG,
        price_currency:     'usd',
        order_id:           params.orderId,
        order_description:  params.description,
        ipn_callback_url:   params.ipnCallbackUrl,
        success_url:        params.successUrl,
        cancel_url:         params.cancelUrl,
        is_fixed_rate:      true, // verrouille le taux crypto à l'instant de la facture, evite un ecart de montant a la reception
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new BadGatewayException(`NOWPayments CreateInvoice ${res.status}: ${text}`);
    }

    const data = await res.json() as any;
    this.logger.log(`Facture crypto créée — orderId=${params.orderId} montant=${params.amountHTG} USD`);
    return { id: String(data.id), invoice_url: data.invoice_url };
  }

  // ── Statut d'un paiement (fallback si l'IPN n'arrive pas) ────────────────
  async getPaymentStatus(paymentId: string): Promise<NowPaymentsIpnPayload> {
    const res = await this.fetchWithTimeout(`${this.apiHost}/payment/${paymentId}`, {
      headers: { 'x-api-key': this.apiKey },
    });
    if (res.status === 404) throw new NotFoundException('Paiement introuvable chez NOWPayments');
    if (!res.ok) throw new BadGatewayException(`NOWPayments GetStatus ${res.status}: ${await res.text()}`);
    return await res.json() as NowPaymentsIpnPayload;
  }

  // ── Vérifie la signature HMAC-SHA512 d'un IPN entrant ────────────────────
  // NOWPayments trie récursivement les clés du corps par ordre alphabétique,
  // re-sérialise en JSON, puis signe cette chaîne avec l'IPN secret. On doit
  // reproduire exactement le même tri pour que la signature corresponde.
  verifyIpnSignature(body: Record<string, any>, signatureHeader: string | undefined): boolean {
    if (!signatureHeader) return false;
    const sorted = this.sortObjectKeys(body);
    const computed = createHmac('sha512', this.ipnSecret)
      .update(JSON.stringify(sorted))
      .digest('hex');
    return computed === signatureHeader;
  }

  private sortObjectKeys(obj: any): any {
    if (Array.isArray(obj)) return obj.map(v => this.sortObjectKeys(v));
    if (obj !== null && typeof obj === 'object') {
      return Object.keys(obj).sort().reduce((acc, key) => {
        acc[key] = this.sortObjectKeys(obj[key]);
        return acc;
      }, {} as Record<string, any>);
    }
    return obj;
  }
}
