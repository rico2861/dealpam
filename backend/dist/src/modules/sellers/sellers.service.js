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
exports.SellersService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
let SellersService = class SellersService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    findAll(status, page = 1, limit = 20) {
        const where = status ? { status: status } : {};
        return this.prisma.seller.findMany({
            where, skip: (page - 1) * limit, take: limit,
            include: { user: { select: { firstName: true, lastName: true, email: true, phone: true } }, store: true, subscriptions: { where: { isActive: true }, include: { plan: true }, take: 1 } },
            orderBy: { createdAt: 'desc' }
        });
    }
    async approve(id, adminId) {
        const s = await this.prisma.seller.findUnique({ where: { id } });
        if (!s)
            throw new common_1.NotFoundException();
        return this.prisma.seller.update({ where: { id }, data: { status: 'APPROVED', approvedBy: adminId, approvedAt: new Date() } });
    }
    async reject(id, reason) {
        return this.prisma.seller.update({ where: { id }, data: { status: 'REJECTED', rejectionReason: reason } });
    }
    async suspend(id) {
        return this.prisma.seller.update({ where: { id }, data: { status: 'SUSPENDED' } });
    }
    async reactivate(id) {
        return this.prisma.seller.update({ where: { id }, data: { status: 'APPROVED' } });
    }
    getMe(userId) {
        return this.prisma.seller.findUnique({
            where: { userId },
            include: { store: true, subscriptions: { where: { isActive: true }, include: { plan: true }, take: 1 } }
        });
    }
};
exports.SellersService = SellersService;
exports.SellersService = SellersService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], SellersService);
//# sourceMappingURL=sellers.service.js.map