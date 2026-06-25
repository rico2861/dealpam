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
exports.CartService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
let CartService = class CartService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getCart(userId) {
        let cart = await this.prisma.cart.findUnique({
            where: { userId },
            include: { items: { include: { product: { include: { images: { where: { isPrimary: true }, take: 1 }, store: { select: { name: true, slug: true } } } } } } }
        });
        if (!cart)
            cart = await this.prisma.cart.findUnique({
                where: { userId },
                include: { items: { include: { product: { include: { images: { where: { isPrimary: true }, take: 1 }, store: { select: { name: true, slug: true } } } } } } }
            }) ?? await this.prisma.cart.create({ data: { userId }, include: { items: { include: { product: { include: { images: { where: { isPrimary: true }, take: 1 }, store: { select: { name: true, slug: true } } } } } } } });
        const total = cart.items.reduce((s, i) => s + (Number(i.product?.salePrice || i.product?.price || 0) * i.quantity), 0);
        return { ...cart, total };
    }
    async addItem(userId, productId, quantity, size, color) {
        const product = await this.prisma.product.findFirst({ where: { id: productId, status: 'PUBLISHED', stock: { gt: 0 } } });
        if (!product)
            throw new common_1.NotFoundException('Produit indisponible');
        let cart = await this.prisma.cart.findUnique({ where: { userId } });
        if (!cart)
            cart = await this.prisma.cart.create({ data: { userId } });
        const existing = await this.prisma.cartItem.findFirst({ where: { cartId: cart.id, productId } });
        if (existing) {
            return this.prisma.cartItem.update({ where: { id: existing.id }, data: { quantity: existing.quantity + quantity } });
        }
        return this.prisma.cartItem.create({ data: { cartId: cart.id, productId, quantity, size, color } });
    }
    async updateItem(userId, itemId, quantity) {
        const cart = await this.prisma.cart.findUnique({ where: { userId } });
        if (!cart)
            throw new common_1.NotFoundException();
        if (quantity <= 0)
            return this.prisma.cartItem.delete({ where: { id: itemId } });
        return this.prisma.cartItem.update({ where: { id: itemId }, data: { quantity } });
    }
    async removeItem(userId, itemId) {
        const cart = await this.prisma.cart.findUnique({ where: { userId } });
        if (!cart)
            throw new common_1.NotFoundException();
        await this.prisma.cartItem.delete({ where: { id: itemId } });
        return { message: 'Article retiré' };
    }
    async clearCart(userId) {
        const cart = await this.prisma.cart.findUnique({ where: { userId } });
        if (cart)
            await this.prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
        return { message: 'Panier vidé' };
    }
};
exports.CartService = CartService;
exports.CartService = CartService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], CartService);
//# sourceMappingURL=cart.service.js.map