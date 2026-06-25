import { PrismaService } from '../../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
export declare class SubscriptionCron {
    private prisma;
    private mail;
    private readonly logger;
    constructor(prisma: PrismaService, mail: MailService);
    handleExpiredSubscriptions(): Promise<void>;
    reactivateSeller(sellerId: string): Promise<void>;
}
