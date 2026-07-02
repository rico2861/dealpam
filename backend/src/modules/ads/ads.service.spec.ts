import { Test } from '@nestjs/testing';
import { BadRequestException, ConflictException } from '@nestjs/common';
import { AdsService } from './ads.service';
import { PrismaService } from '../../prisma/prisma.service';
import { WalletService } from '../wallet/wallet.service';
import { MoncashService } from '../moncash/moncash.service';

describe('AdsService — payCampaign (MONCASH)', () => {
  let service: AdsService;
  let prisma: any;
  let wallet: any;
  let moncash: any;

  const campaign = { id: 'camp1', sellerId: 's1', status: 'PENDING_PAYMENT', totalBudget: 1000 };

  beforeEach(async () => {
    prisma = {
      adCampaign: { findFirst: jest.fn().mockResolvedValue(campaign), update: jest.fn() },
      payment: { create: jest.fn() },
    };
    wallet = { deductForCampaign: jest.fn() };
    moncash = { verifyByTransactionId: jest.fn() };

    const moduleRef = await Test.createTestingModule({
      providers: [
        AdsService,
        { provide: PrismaService, useValue: prisma },
        { provide: WalletService, useValue: wallet },
        { provide: MoncashService, useValue: moncash },
      ],
    }).compile();

    service = moduleRef.get(AdsService);
  });

  it('rejette si la transaction MonCash est introuvable/invalide', async () => {
    moncash.verifyByTransactionId.mockRejectedValue(new Error('not found'));
    await expect(service.payCampaign('camp1', 's1', 'MONCASH', 'FAKE-REF')).rejects.toThrow(BadRequestException);
    expect(prisma.adCampaign.update).not.toHaveBeenCalled();
  });

  it('rejette si MonCash ne confirme pas le paiement ("successful")', async () => {
    moncash.verifyByTransactionId.mockResolvedValue({ message: 'failed', cost: 1000 });
    await expect(service.payCampaign('camp1', 's1', 'MONCASH', 'REF1')).rejects.toThrow(BadRequestException);
  });

  it('rejette si le montant payé est inférieur au budget de la campagne', async () => {
    moncash.verifyByTransactionId.mockResolvedValue({ message: 'successful', cost: 500 });
    await expect(service.payCampaign('camp1', 's1', 'MONCASH', 'REF1')).rejects.toThrow(BadRequestException);
  });

  it('rejette la réutilisation d\'une référence déjà utilisée (contrainte unique)', async () => {
    moncash.verifyByTransactionId.mockResolvedValue({ message: 'successful', cost: 1000 });
    prisma.payment.create.mockRejectedValue({ code: 'P2002' });
    await expect(service.payCampaign('camp1', 's1', 'MONCASH', 'REF-REUSED')).rejects.toThrow(ConflictException);
  });

  it('valide la campagne quand la vérification MonCash passe', async () => {
    moncash.verifyByTransactionId.mockResolvedValue({ message: 'successful', cost: 1000 });
    prisma.payment.create.mockResolvedValue({ id: 'pay1' });
    prisma.adCampaign.update.mockResolvedValue({ id: 'camp1', status: 'PENDING_REVIEW' });

    await service.payCampaign('camp1', 's1', 'MONCASH', 'REF-OK');

    expect(prisma.adCampaign.update).toHaveBeenCalledWith({
      where: { id: 'camp1' },
      data: { status: 'PENDING_REVIEW', paymentId: 'pay1' },
    });
  });

  it('n\'appelle jamais MonCash côté WALLET (chemin séparé, débit via WalletService)', async () => {
    wallet.deductForCampaign.mockResolvedValue({ balance: 0 });
    prisma.adCampaign.update.mockResolvedValue({ id: 'camp1', status: 'PENDING_REVIEW' });

    await service.payCampaign('camp1', 's1', 'WALLET');

    expect(moncash.verifyByTransactionId).not.toHaveBeenCalled();
    expect(wallet.deductForCampaign).toHaveBeenCalledWith('s1', 'camp1', 1000);
  });
});
