import {
  Injectable,
  Logger,
  NotFoundException,
  BadGatewayException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface MoncashPayment {
  reference: string;
  transaction_id: string;
  cost: number;
  message: string;
  payer: string;
}

@Injectable()
export class MoncashService {
  private readonly logger = new Logger(MoncashService.name);

  private readonly apiHost: string;
  private readonly gatewayBase: string;
  private readonly clientId: string;
  private readonly clientSecret: string;

  private _token: string | null = null;
  private _tokenExpiry = 0;

  constructor(private config: ConfigService) {
    const mode = config.get<string>('MONCASH_MODE', 'sandbox');
    const isLive = mode === 'live';

    this.apiHost = isLive
      ? 'https://moncashbutton.digicelgroup.com/Api'
      : 'https://sandbox.moncashbutton.digicelgroup.com/Api';

    this.gatewayBase = isLive
      ? 'https://moncashbutton.digicelgroup.com/Moncash-middleware'
      : 'http://sandbox.moncashbutton.digicelgroup.com/Moncash-middleware';

    this.clientId     = config.get<string>('MONCASH_CLIENT_ID', '');
    this.clientSecret = config.get<string>('MONCASH_CLIENT_SECRET', '');
  }

  // ── Token (cache 49s, expire 59s côté MonCash) ───────────────────────────
  async getToken(): Promise<string> {
    if (this._token && Date.now() < this._tokenExpiry) return this._token;

    const credentials = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');

    const res = await fetch(`${this.apiHost}/oauth/token`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${credentials}`,
        Accept:        'application/json',
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'scope=read,write&grant_type=client_credentials',
    });

    if (!res.ok) {
      const text = await res.text();
      throw new BadGatewayException(`MonCash token error ${res.status}: ${text}`);
    }

    const data = (await res.json()) as any;
    this._token      = data.access_token;
    this._tokenExpiry = Date.now() + 49_000;
    this.logger.log('MonCash token rafraîchi');
    return this._token!;
  }

  // ── Créer un paiement ────────────────────────────────────────────────────
  async createPayment(
    amount: number,
    orderId: string,
  ): Promise<{ redirectUrl: string; paymentToken: string }> {
    const token = await this.getToken();

    const res = await fetch(`${this.apiHost}/v1/CreatePayment`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept:        'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ amount, orderId }),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new BadGatewayException(`MonCash CreatePayment ${res.status}: ${text}`);
    }

    const data         = (await res.json()) as any;
    const paymentToken = data.payment_token.token as string;
    const redirectUrl  = `${this.gatewayBase}/Payment/Redirect?token=${paymentToken}`;

    this.logger.log(`Paiement créé — orderId=${orderId} amount=${amount} HTG`);
    return { redirectUrl, paymentToken };
  }

  // ── Vérifier par transactionId MonCash (après retour utilisateur) ────────
  async verifyByTransactionId(transactionId: string): Promise<MoncashPayment> {
    const token = await this.getToken();

    const res = await fetch(`${this.apiHost}/v1/RetrieveTransactionPayment`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept:        'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ transactionId }),
    });

    if (res.status === 404) throw new NotFoundException('Transaction introuvable chez MonCash');
    if (!res.ok) {
      const text = await res.text();
      throw new BadGatewayException(`MonCash RetrieveTX ${res.status}: ${text}`);
    }

    const data = (await res.json()) as any;
    return data.payment as MoncashPayment;
  }

  // ── Vérifier par orderId interne (fallback) ──────────────────────────────
  async verifyByOrderId(orderId: string): Promise<MoncashPayment> {
    const token = await this.getToken();

    const res = await fetch(`${this.apiHost}/v1/RetrieveOrderPayment`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept:        'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ orderId }),
    });

    if (res.status === 404) throw new NotFoundException('Commande introuvable chez MonCash');
    if (!res.ok) {
      const text = await res.text();
      throw new BadGatewayException(`MonCash RetrieveOrder ${res.status}: ${text}`);
    }

    const data = (await res.json()) as any;
    return data.payment as MoncashPayment;
  }

  // ── Payout (retrait vers numéro MonCash) ─────────────────────────────────
  async payout(
    receiver: string,
    amount: number,
    desc: string,
    reference: string,
  ): Promise<{ transaction_id: string; message: string }> {
    if (!this.config.get<string>('MONCASH_PAYOUT_ENABLED', 'false').includes('true')) {
      throw new BadGatewayException('Payout MonCash non activé');
    }

    const token = await this.getToken();

    const res = await fetch(`${this.apiHost}/v1/Transfert`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept:        'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ amount, receiver, desc, reference }),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new BadGatewayException(`MonCash Payout ${res.status}: ${text}`);
    }

    const data = (await res.json()) as any;
    return data.transfer;
  }
}
