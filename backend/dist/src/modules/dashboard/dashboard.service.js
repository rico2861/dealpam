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
exports.DashboardService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
let DashboardService = class DashboardService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getAdminStats() {
        const [totalUsers, totalSellers, pendingSellers, totalProducts, pendingProducts, totalOrders, activeSubscriptions] = await Promise.all([
            this.prisma.user.count(),
            this.prisma.seller.count(),
            this.prisma.seller.count({ where: { status: 'PENDING' } }),
            this.prisma.product.count({ where: { status: 'PUBLISHED' } }),
            this.prisma.product.count({ where: { status: 'PENDING_REVIEW' } }),
            this.prisma.order.count(),
            this.prisma.sellerSubscription.count({ where: { isActive: true, endDate: { gt: new Date() } } }),
        ]);
        return { totalUsers, totalSellers, pendingSellers, totalProducts, pendingProducts, totalOrders, activeSubscriptions };
    }
    async getSellerStats(userId) {
        const seller = await this.prisma.seller.findUnique({ where: { userId }, include: { store: true } });
        if (!seller?.store)
            return {};
        const [products, orders, revenue] = await Promise.all([
            this.prisma.product.count({ where: { storeId: seller.store.id } }),
            this.prisma.order.count({ where: { storeId: seller.store.id } }),
            this.prisma.order.aggregate({ where: { storeId: seller.store.id, status: 'DELIVERED' }, _sum: { totalHTG: true } }),
        ]);
        return { products, orders, revenue: revenue._sum.totalHTG || 0 };
    }
};
exports.DashboardService = DashboardService;
exports.DashboardService = DashboardService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], DashboardService);
//# sourceMappingURL=dashboard.service.js.map