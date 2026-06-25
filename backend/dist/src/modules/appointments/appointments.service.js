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
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppointmentsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
const mail_service_1 = require("../mail/mail.service");
let AppointmentsService = class AppointmentsService {
    constructor(prisma, mail) {
        this.prisma = prisma;
        this.mail = mail;
    }
    async create(userId, dto) {
        const product = await this.prisma.product.findUnique({
            where: { id: dto.productId },
            include: { store: { include: { seller: { include: { user: true } } } } },
        });
        if (!product)
            throw new common_1.NotFoundException('Produit introuvable');
        if (!product.requiresAppointment)
            throw new common_1.BadRequestException('Ce produit n\'accepte pas de rendez-vous');
        const appt = await this.prisma.appointment.create({
            data: {
                userId,
                productId: dto.productId,
                storeId: product.storeId,
                scheduledAt: new Date(dto.scheduledAt),
                note: dto.note,
            },
            include: { product: true, store: true },
        });
        const sellerUser = product.store?.seller?.user;
        if (sellerUser) {
            this.mail.sendRaw(sellerUser.email, 'Nouvelle demande de rendez-vous — Dealpam', `Un client a demandé un rendez-vous pour <strong>${product.name}</strong> le <strong>${new Date(dto.scheduledAt).toLocaleString('fr-FR')}</strong>.<br/>Connectez-vous à votre dashboard pour confirmer ou refuser.`).catch(() => null);
        }
        return appt;
    }
    async findForUser(userId) {
        return this.prisma.appointment.findMany({
            where: { userId },
            include: { product: { include: { images: { where: { isPrimary: true }, take: 1 } } }, store: true },
            orderBy: { scheduledAt: 'asc' },
        });
    }
    async findForSeller(sellerId) {
        const store = await this.prisma.store.findUnique({ where: { sellerId } });
        if (!store)
            throw new common_1.NotFoundException('Boutique introuvable');
        return this.prisma.appointment.findMany({
            where: { storeId: store.id },
            include: { product: true, store: false },
            orderBy: { scheduledAt: 'asc' },
        });
    }
    async updateStatus(sellerId, id, status, sellerNote) {
        const store = await this.prisma.store.findUnique({ where: { sellerId } });
        const appt = await this.prisma.appointment.findFirst({ where: { id, storeId: store?.id } });
        if (!appt)
            throw new common_1.ForbiddenException('Rendez-vous introuvable');
        return this.prisma.appointment.update({ where: { id }, data: { status: status, sellerNote } });
    }
    async cancel(userId, id) {
        const appt = await this.prisma.appointment.findFirst({ where: { id, userId } });
        if (!appt)
            throw new common_1.ForbiddenException('Rendez-vous introuvable');
        return this.prisma.appointment.update({ where: { id }, data: { status: 'CANCELLED' } });
    }
};
exports.AppointmentsService = AppointmentsService;
exports.AppointmentsService = AppointmentsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService, mail_service_1.MailService])
], AppointmentsService);
//# sourceMappingURL=appointments.service.js.map