import { Test } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { PrismaService } from '../../prisma/prisma.service';
import { MailService } from '../mail/mail.service';

describe('OrdersService', () => {
  let service: OrdersService;
  let prisma: any;
  let mail: any;

  beforeEach(async () => {
    prisma = {
      order: { findFirst: jest.fn(), update: jest.fn() },
      address: { findFirst: jest.fn() },
    };
    mail = { sendOrderStatusUpdate: jest.fn().mockResolvedValue(undefined) };

    const moduleRef = await Test.createTestingModule({
      providers: [
        OrdersService,
        { provide: PrismaService, useValue: prisma },
        { provide: MailService, useValue: mail },
      ],
    }).compile();

    service = moduleRef.get(OrdersService);
  });

  describe('findOne — IDOR guard', () => {
    it('ne renvoie jamais la commande d\'un autre utilisateur (filtre userId dans la requête)', async () => {
      prisma.order.findFirst.mockResolvedValue(null); // simulate: commande existe mais appartient à un autre user

      await expect(service.findOne('order1', 'attacker-id')).rejects.toThrow(NotFoundException);
      expect(prisma.order.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'order1', userId: 'attacker-id' } }),
      );
    });

    it('renvoie la commande quand l\'appelant en est bien le propriétaire', async () => {
      const order = { id: 'order1', userId: 'owner-id', items: [], store: {} };
      prisma.order.findFirst.mockResolvedValue(order);

      const result = await service.findOne('order1', 'owner-id');
      expect(result).toBe(order);
    });
  });

  describe('updateStatus — restriction REFUNDED', () => {
    it('rejette REFUNDED si la commande n\'est ni DELIVERED ni CANCELLED', async () => {
      prisma.order.findFirst.mockResolvedValue({
        id: 'order1', status: 'CONFIRMED', notes: null,
        user: { email: 'a@a.com', firstName: 'A' },
        store: { id: 'store1', sellerId: 's1', reputationScore: 100 },
        items: [],
      });

      await expect(service.updateStatus('order1', 'REFUNDED')).rejects.toThrow(BadRequestException);
      expect(prisma.order.update).not.toHaveBeenCalled();
    });

    it('autorise REFUNDED sur une commande DELIVERED et trace une note informative', async () => {
      prisma.order.findFirst.mockResolvedValue({
        id: 'order1', status: 'DELIVERED', notes: null,
        user: { email: 'a@a.com', firstName: 'A' },
        store: { id: 'store1', sellerId: 's1', reputationScore: 100 },
        items: [],
      });
      prisma.order.update.mockResolvedValue({ id: 'order1', status: 'REFUNDED' });

      await service.updateStatus('order1', 'REFUNDED');

      const callArgs = prisma.order.update.mock.calls[0][0];
      expect(callArgs.data.status).toBe('REFUNDED');
      expect(callArgs.data.notes).toContain('REFUNDED');
    });
  });
});
