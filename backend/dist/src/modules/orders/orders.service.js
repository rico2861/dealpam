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
exports.OrdersService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
let OrdersService = class OrdersService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async create(userId, addressId, notes) {
        const cart = await this.prisma.cart.findUnique({
            where: { userId },
            include: { items: { include: { product: { include: { images: { where: { isPrimary: true }, take: 1 } } } } } }
        });
        if (!cart || cart.items.length === 0)
            throw new common_1.ForbiddenException('Panier vide');
        const storeGroups = cart.items.reduce((acc, item) => {
            const key = item.product.storeId;
            if (!acc[key])
                acc[key] = [];
            acc[key].push(item);
            return acc;
        }, {});
        const orders = [];
        for (const [storeId, items] of Object.entries(storeGroups)) {
            const subtotal = items.reduce((s, i) => s + Number(i.product.salePrice || i.product.price) * i.quantity, 0);
            const order = await this.prisma.order.create({
                data: {
                    userId, storeId, addressId, notes,
                    subtotalHTG: subtotal, totalHTG: subtotal,
                    items: {
                        create: items.map((i) => ({
                            productId: i.productId,
                            productName: i.product.name,
                            imageUrl: i.product.images[0]?.url || null,
                            quantity: i.quantity,
                            unitPrice: i.product.salePrice || i.product.price,
                            subtotal: Number(i.product.salePrice || i.product.price) * i.quantity,
                        }))
                    }
                },
                include: { items: true }
            });
            orders.push(order);
        }
        await this.prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
        return orders;
    }
    findMyOrders(userId, page = 1, limit = 10) {
        return this.prisma.order.findMany({
            where: { userId },
            include: { items: true, store: { select: { name: true, slug: true, logoUrl: true } }, payment: true },
            skip: (page - 1) * limit, take: limit,
            orderBy: { createdAt: 'desc' }
        });
    }
    async findOne(id, userId) {
        const order = await this.prisma.order.findFirst({
            where: { id, userId },
            include: { items: { include: { product: true } }, address: true, payment: true, store: true }
        });
        if (!order)
            throw new common_1.NotFoundException('Commande introuvable');
        return order;
    }
    async updateStatus(id, status, sellerId) {
        const where = { id };
        if (sellerId)
            where.store = { sellerId };
        const order = await this.prisma.order.findFirst({ where });
        if (!order)
            throw new common_1.NotFoundException();
        return this.prisma.order.update({ where: { id }, data: { status: status } });
    }
    findAll(page = 1, limit = 20) {
        return this.prisma.order.findMany({
            include: { user: { select: { firstName: true, lastName: true, email: true } }, store: { select: { name: true } } },
            skip: (page - 1) * limit, take: limit,
            orderBy: { createdAt: 'desc' }
        });
    }
    findSellerOrders(sellerId, page = 1) {
        return this.prisma.order.findMany({
            where: { store: { sellerId } },
            include: { user: { select: { firstName: true, lastName: true } }, items: true },
            skip: (page - 1) * 20, take: 20,
            orderBy: { createdAt: 'desc' }
        });
    }
};
exports.OrdersService = OrdersService;
exports.OrdersService = OrdersService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], OrdersService);
//# sourceMappingURL=orders.service.js.map