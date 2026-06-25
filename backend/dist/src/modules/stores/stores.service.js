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
exports.StoresService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
let StoresService = class StoresService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    findAll(page = 1, limit = 20) {
        return this.prisma.store.findMany({
            where: { isActive: true },
            include: { seller: { include: { subscriptions: { where: { isActive: true }, include: { plan: true }, take: 1 } } }, _count: { select: { products: true } } },
            skip: (page - 1) * limit, take: limit
        });
    }
    async findBySlug(slug) {
        const store = await this.prisma.store.findUnique({ where: { slug }, include: { seller: true, _count: { select: { products: true, reviews: true } } } });
        if (!store)
            throw new common_1.NotFoundException('Boutique introuvable');
        return store;
    }
    async updateMe(userId, data) {
        const seller = await this.prisma.seller.findUnique({ where: { userId } });
        if (!seller)
            throw new common_1.NotFoundException();
        return this.prisma.store.update({ where: { sellerId: seller.id }, data });
    }
};
exports.StoresService = StoresService;
exports.StoresService = StoresService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], StoresService);
//# sourceMappingURL=stores.service.js.map