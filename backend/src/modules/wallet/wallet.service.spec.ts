import { Test } from '@nestjs/testing';
import { BadRequestException, ConflictException } from '@nestjs/common';
import { WalletService } from './wallet.service';
import { PrismaService } from '../../prisma/prisma.service';
import { MoncashService } from '../moncash/moncash.service';
import { MoncashTransactionsService } from '../moncash-transactions/moncash-transactions.service';

describe('WalletService', () => {
  let service: WalletService;
  let prisma: any;
  let moncash: any;
  let moncashTx: any;

  beforeEach(async () => {
    prisma = {
      sellerWallet: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
        findUniqueOrThrow: jest.fn(),
      },
      walletTransaction: {
        findFirst: jest.fn(),
        create: jest.fn(),
        updateMany: jest.fn(),
      },
    };
    moncash = { verifyByTransactionId: jest.fn() };
    moncashTx = {
      record: jest.fn().mockResolvedValue({}),
      isAlreadyCredited: jest.fn().mockResolvedValue(false),
      claimCredit: jest.fn().mockResolvedValue(true),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        WalletService,
        { provide: PrismaService, useValue: prisma },
        { provide: MoncashService, useValue: moncash },
        { provide: MoncashTransactionsService, useValue: moncashTx },
      ],
    }).compile();

    service = moduleRef.get(WalletService);
  });

  describe('deductForCampaign — atomic balance guard', () => {
    it('rejette le débit si le solde est insuffisant (updateMany ne modifie aucune ligne)', async () => {
      prisma.sellerWallet.findUnique.mockResolvedValue({ id: 'w1', sellerId: 's1', balance: 500 });
      prisma.sellerWallet.updateMany.mockResolvedValue({ count: 0 }); // condition balance>=amount non satisfaite

      await expect(service.deductForCampaign('s1', 'camp1', 800)).rejects.toThrow(BadRequestException);
      expect(prisma.walletTransaction.create).not.toHaveBeenCalled();
    });

    it('débite atomiquement quand le solde est suffisant, sans lecture+écriture séparée', async () => {
      prisma.sellerWallet.findUnique.mockResolvedValue({ id: 'w1', sellerId: 's1', balance: 1000 });
      prisma.sellerWallet.updateMany.mockResolvedValue({ count: 1 });
      prisma.sellerWallet.findUniqueOrThrow.mockResolvedValue({ id: 'w1', balance: 200 });
      prisma.walletTransaction.create.mockResolvedValue({});

      const result = await service.deductForCampaign('s1', 'camp1', 800);

      // La condition atomique doit être passée dans le `where`, pas vérifiée en JS séparément
      expect(prisma.sellerWallet.updateMany).toHaveBeenCalledWith({
        where: { id: 'w1', balance: { gte: 800 } },
        data: { balance: { decrement: 800 } },
      });
      expect(result.balance).toBe(200);
    });

    it('deux débits concurrents ne peuvent pas tous les deux réussir si le solde ne couvre qu\'un seul', async () => {
      // Simule la race condition historique : les deux appels liraient balance=1000,
      // mais l'updateMany conditionnel ne doit laisser passer qu'un seul débit de 800.
      prisma.sellerWallet.findUnique.mockResolvedValue({ id: 'w1', sellerId: 's1', balance: 1000 });
      prisma.sellerWallet.updateMany
        .mockResolvedValueOnce({ count: 1 })  // premier débit : solde encore à 1000, passe
        .mockResolvedValueOnce({ count: 0 }); // second débit concurrent : solde réel déjà tombé à 200, échoue
      prisma.sellerWallet.findUniqueOrThrow.mockResolvedValue({ id: 'w1', balance: 200 });
      prisma.walletTransaction.create.mockResolvedValue({});

      const first = await service.deductForCampaign('s1', 'camp1', 800);
      await expect(service.deductForCampaign('s1', 'camp2', 800)).rejects.toThrow(BadRequestException);

      expect(first.balance).toBe(200);
    });
  });

  describe('confirmRecharge — anti-double-crédit', () => {
    const pending = { id: 'pending1', walletId: 'w1' };

    it('rejette si la référence a déjà été créditée', async () => {
      prisma.walletTransaction.findFirst.mockResolvedValueOnce({ id: 'tx1' }); // already credited
      await expect(service.confirmRecharge('TX123')).rejects.toThrow(ConflictException);
    });

    it('rejette si la demande pending a déjà été consommée par une autre requête concurrente', async () => {
      prisma.walletTransaction.findFirst
        .mockResolvedValueOnce(null) // pas déjà créditée
        .mockResolvedValueOnce(pending); // pending trouvé
      moncash.verifyByTransactionId.mockResolvedValue({ cost: 500, reference: 'ORDER1', message: 'successful', transaction_id: 'TX123' });
      prisma.walletTransaction.updateMany.mockResolvedValue({ count: 0 }); // déjà consommé par une autre requête

      await expect(service.confirmRecharge('TX123')).rejects.toThrow(ConflictException);
      expect(prisma.sellerWallet.update).not.toHaveBeenCalled();
    });

    it('crédite atomiquement (increment) quand tout est valide', async () => {
      prisma.walletTransaction.findFirst
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(pending);
      moncash.verifyByTransactionId.mockResolvedValue({ cost: 500, reference: 'ORDER1', message: 'successful', transaction_id: 'TX123' });
      prisma.walletTransaction.updateMany.mockResolvedValue({ count: 1 });
      prisma.sellerWallet.update.mockResolvedValue({ id: 'w1', balance: 500 });
      prisma.walletTransaction.create.mockResolvedValue({});

      const result = await service.confirmRecharge('TX123');

      expect(prisma.sellerWallet.update).toHaveBeenCalledWith({
        where: { id: 'w1' },
        data: { balance: { increment: 500 } },
      });
      expect(result.balance).toBe(500);
    });
  });
});
