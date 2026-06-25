"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var SubscriptionCron_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SubscriptionCron = void 0;
const common_1 = require("@nestjs/common");
const schedule_1 = require("@nestjs/schedule");
const prisma_service_1 = require("../../prisma/prisma.service");
const mail_service_1 = require("../mail/mail.service");
let SubscriptionCron = SubscriptionCron_1 = class SubscriptionCron {
    constructor(prisma, mail) {
        this.prisma = prisma;
        this.mail = mail;
        this.logger = new common_1.Logger(SubscriptionCron_1.name);
    }
    async handleExpiredSubscriptions() {
        this.logger.log('Running subscription expiry check…');
        const now = new Date();
        const expired = await this.prisma.sellerSubscription.findMany({
            where: { isActive: true, endDate: { lt: now } },
            include: {
                seller: {
                    include: {
                        store: true,
                        user: true,
                    },
                },
                plan: true,
            },
        });
        for (const sub of expired) {
            try {
                await this.prisma.sellerSubscription.update({
                    where: { id: sub.id },
                    data: { isActive: false },
                });
                if (sub.seller.store) {
                    await this.prisma.product.updateMany({
                        where: { storeId: sub.seller.store.id, status: 'PUBLISHED' },
                        data: { status: 'SUSPENDED' },
                    });
                    await this.prisma.store.update({
                        where: { id: sub.seller.store.id },
                        data: { isActive: false },
                    });
                }
                const user = sub.seller.user;
                if (user?.email) {
                    await this.mail.sendRaw(user.email, '⚠️ Votre abonnement Dealpam a expiré', `
            <p>Bonjour <strong>${user.firstName}</strong>,</p>
            <p>Votre abonnement <strong>${sub.plan.name}</strong> a expiré le <strong>${sub.endDate.toLocaleDateString('fr-FR')}</strong>.</p>
            <p>Conséquences :</p>
            <ul>
              <li>❌ Vos produits ont été désactivés</li>
              <li>❌ Votre boutique est temporairement inactive</li>
            </ul>
            <p>Renouvelez votre abonnement pour réactiver votre boutique immédiatement.</p>
            <p><a href="${process.env.FRONTEND_URL}/seller/subscription" style="background:#2563EB;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;">Renouveler mon abonnement</a></p>
            `).catch(() => null);
                }
                this.logger.log(`Suspended seller ${sub.seller.id} (expired: ${sub.endDate.toISOString()})`);
            }
            catch (err) {
                this.logger.error(`Failed to process expired sub ${sub.id}: ${err.message}`);
            }
        }
        const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
        const expiringSoon = await this.prisma.sellerSubscription.findMany({
            where: {
                isActive: true,
                endDate: { gte: now, lte: threeDaysFromNow },
            },
            include: { seller: { include: { user: true } }, plan: true },
        });
        for (const sub of expiringSoon) {
            const user = sub.seller.user;
            const daysLeft = Math.ceil((sub.endDate.getTime() - now.getTime()) / 86400000);
            if (user?.email) {
                await this.mail.sendRaw(user.email, `⏰ Votre abonnement expire dans ${daysLeft} jour(s)`, `
          <p>Bonjour <strong>${user.firstName}</strong>,</p>
          <p>Votre abonnement <strong>${sub.plan.name}</strong> expire dans <strong>${daysLeft} jour(s)</strong>.</p>
          <p>Renouvelez maintenant pour éviter la suspension de votre boutique.</p>
          <p><a href="${process.env.FRONTEND_URL}/seller/subscription" style="background:#2563EB;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;">Renouveler</a></p>
          `).catch(() => null);
            }
        }
        this.logger.log(`Done: ${expired.length} expired, ${expiringSoon.length} warned`);
    }
    async reactivateSeller(sellerId) {
        const store = await this.prisma.store.findUnique({ where: { sellerId } });
        if (!store)
            return;
        await this.prisma.store.update({ where: { id: store.id }, data: { isActive: true } });
        await this.prisma.product.updateMany({
            where: { storeId: store.id, status: 'SUSPENDED' },
            data: { status: 'PUBLISHED' },
        });
        this.logger.log(`Reactivated seller ${sellerId}`);
    }
};
exports.SubscriptionCron = SubscriptionCron;
__decorate([
    (0, schedule_1.Cron)(schedule_1.CronExpression.EVERY_DAY_AT_2AM),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], SubscriptionCron.prototype, "handleExpiredSubscriptions", null);
exports.SubscriptionCron = SubscriptionCron = SubscriptionCron_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService, mail_service_1.MailService])
], SubscriptionCron);
//# sourceMappingURL=subscription.cron.js.map