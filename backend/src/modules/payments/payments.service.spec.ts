import { Test } from '@nestjs/testing';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { PrismaService } from '../../prisma/prisma.service';
import { MoncashService } from '../moncash/moncash.service';
import { CouponsService } from '../coupons/coupons.service';
import { MoncashTransactionsService } from '../moncash-transactions/moncash-transactions.service';
import { NotificationsService } from '../notifications/notifications.service';
import { WalletService } from '../wallet/wallet.service';

describe('PaymentsService — verifySellerPayment (argent réel, ne jamais faire confiance au client)', () => {
  let service: PaymentsService;
  let prisma: any;
  let moncash: any;
  let coupons: any;
  let moncashTx: any;
  let notifications: any;
  let wallet: any;

  const mcSuccess = {
    message: 'successful', transaction_id: 'mc-tx-1', reference: 'sub-123', cost: 1000, payer: '50912345678',
  };

  beforeEach(async () => {
    prisma = {
      payment: { findUnique: jest.fn(), findFirst: jest.fn(), update: jest.fn() },
      user: { findMany: jest.fn().mockResolvedValue([]) },
      auditLog: { create: jest.fn().mockResolvedValue({}) },
      $transaction: jest.fn((arg: any) => (typeof arg === 'function' ? arg(prisma) : Promise.all(arg))),
    };
    moncash = { verifyByTransactionId: jest.fn() };
    coupons = {};
    moncashTx = {
      record: jest.fn().mockResolvedValue({}),
      isAlreadyCredited: jest.fn().mockResolvedValue(false),
      claimCredit: jest.fn().mockResolvedValue(true),
    };
    notifications = { create: jest.fn().mockResolvedValue(undefined) };
    wallet = { creditFromMc: jest.fn() };

    const moduleRef = await Test.createTestingModule({
      providers: [
        PaymentsService,
        { provide: PrismaService, useValue: prisma },
        { provide: MoncashService, useValue: moncash },
        { provide: CouponsService, useValue: coupons },
        { provide: MoncashTransactionsService, useValue: moncashTx },
        { provide: NotificationsService, useValue: notifications },
        { provide: WalletService, useValue: wallet },
      ],
    }).compile();

    service = moduleRef.get(PaymentsService);
  });

  it('bloque le double-crédit si un Payment COMPLETED existe déjà pour ce transaction_id', async () => {
    prisma.payment.findUnique.mockResolvedValue({ status: 'COMPLETED' });

    await expect(service.verifySellerPayment('mc-tx-1')).rejects.toThrow(ConflictException);
    expect(moncash.verifyByTransactionId).not.toHaveBeenCalled();
  });

  it('rejette si MonCash ne confirme pas le paiement (message != successful)', async () => {
    prisma.payment.findUnique.mockResolvedValue(null);
    moncash.verifyByTransactionId.mockResolvedValue({ ...mcSuccess, message: 'failed' });

    await expect(service.verifySellerPayment('mc-tx-1')).rejects.toThrow(BadRequestException);
    expect(moncashTx.record).toHaveBeenCalledWith(expect.objectContaining({ status: 'FAILED' }));
  });

  it('bloque le double-crédit via le verrou centralisé isAlreadyCredited, même si MonCash confirme "successful"', async () => {
    prisma.payment.findUnique.mockResolvedValue(null);
    moncash.verifyByTransactionId.mockResolvedValue(mcSuccess);
    moncashTx.isAlreadyCredited.mockResolvedValue(true);

    await expect(service.verifySellerPayment('mc-tx-1')).rejects.toThrow(ConflictException);
    expect(prisma.payment.update).not.toHaveBeenCalled();
  });

  it('route vers WalletService.creditFromMc quand la référence commence par WALLET- (jamais géré par les tables Payment)', async () => {
    prisma.payment.findUnique.mockResolvedValue(null);
    moncash.verifyByTransactionId.mockResolvedValue({ ...mcSuccess, reference: 'WALLET-abc123' });
    wallet.creditFromMc.mockResolvedValue({ type: 'wallet', balance: 1000 });

    const result = await service.verifySellerPayment('mc-tx-1');

    expect(wallet.creditFromMc).toHaveBeenCalledWith(expect.objectContaining({ reference: 'WALLET-abc123' }));
    expect(result).toEqual({ type: 'wallet', balance: 1000 });
    expect(prisma.payment.findFirst).not.toHaveBeenCalled();
  });

  it("échoue si aucun paiement PENDING ne correspond à la référence MonCash (jamais d'activation sans Payment tracé)", async () => {
    prisma.payment.findUnique.mockResolvedValue(null);
    moncash.verifyByTransactionId.mockResolvedValue(mcSuccess);
    prisma.payment.findFirst.mockResolvedValue(null);

    await expect(service.verifySellerPayment('mc-tx-1')).rejects.toThrow(NotFoundException);
  });

  it("n'active PAS automatiquement si le montant reçu est significativement inférieur au montant attendu — notifie les admins à la place", async () => {
    prisma.payment.findUnique.mockResolvedValue(null);
    moncash.verifyByTransactionId.mockResolvedValue({ ...mcSuccess, cost: 500 }); // attendu 1000, reçu 500
    prisma.payment.findFirst.mockResolvedValue({
      id: 'pay1', amountHTG: 1000, subscriptionId: 'sub1', adCampaign: null, subscription: {},
    });
    prisma.user.findMany.mockResolvedValue([{ id: 'admin1' }]); // notifyAdminsOfMismatch doit prévenir les admins existants

    const result = await service.verifySellerPayment('mc-tx-1');

    expect(result.type).toBe('payment_review');
    expect(prisma.payment.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'pay1' },
      data: expect.objectContaining({ status: 'COMPLETED', failureReason: expect.stringContaining('AMOUNT_MISMATCH') }),
    }));
    expect(notifications.create).toHaveBeenCalledWith('admin1', expect.any(String), expect.any(String), 'PAYMENT_AMOUNT_MISMATCH');
    // Le paiement est marqué complété (l'argent a bien été reçu) mais RIEN n'active la souscription :
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('active la souscription immédiatement quand le montant correspond (tolérance 2%)', async () => {
    prisma.payment.findUnique.mockResolvedValue(null);
    moncash.verifyByTransactionId.mockResolvedValue(mcSuccess); // cost: 1000
    const subUpdate = jest.fn().mockResolvedValue({
      seller: { status: 'PENDING', stores: [], userId: 'u1' }, plan: { tier: 'BUSINESS' }, id: 'sub1', startDate: new Date(0),
    });
    prisma.payment.findFirst.mockResolvedValue({
      id: 'pay1', amountHTG: 1000, subscriptionId: 'sub1', adCampaign: null,
      subscription: { startDate: new Date(0) }, couponId: null,
    });
    prisma.sellerSubscription = { update: subUpdate };
    prisma.businessDocument = { findMany: jest.fn().mockResolvedValue([]) };

    const result = await service.verifySellerPayment('mc-tx-1');

    expect(result.type).toBe('subscription');
    expect(subUpdate).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'sub1' }, data: { isActive: true },
    }));
  });

  it('tolère un écart de moins de 2% (arrondi MonCash) sans passer en revue admin', async () => {
    prisma.payment.findUnique.mockResolvedValue(null);
    moncash.verifyByTransactionId.mockResolvedValue({ ...mcSuccess, cost: 991 }); // 0.9% sous 1000
    const subUpdate = jest.fn().mockResolvedValue({
      seller: { status: 'PENDING', stores: [], userId: 'u1' }, plan: { tier: 'BUSINESS' }, id: 'sub1', startDate: new Date(0),
    });
    prisma.payment.findFirst.mockResolvedValue({
      id: 'pay1', amountHTG: 1000, subscriptionId: 'sub1', adCampaign: null,
      subscription: { startDate: new Date(0) }, couponId: null,
    });
    prisma.sellerSubscription = { update: subUpdate };
    prisma.businessDocument = { findMany: jest.fn().mockResolvedValue([]) };

    const result = await service.verifySellerPayment('mc-tx-1');

    expect(result.type).toBe('subscription');
    expect(notifications.create).not.toHaveBeenCalled();
  });
});
