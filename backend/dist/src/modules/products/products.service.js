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
exports.ProductsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
const upload_service_1 = require("../upload/upload.service");
let ProductsService = class ProductsService {
    constructor(prisma, uploadService) {
        this.prisma = prisma;
        this.uploadService = uploadService;
    }
    async findAll(filter) {
        const { category, brand, minPrice, maxPrice, search, sort, page = 1, limit = 20, storeId, inStock, department, featured, sponsored, minRating } = filter;
        const where = { status: 'PUBLISHED' };
        if (category)
            where.category = { slug: category };
        if (brand)
            where.brand = { slug: brand };
        if (minPrice)
            where.price = { ...where.price, gte: minPrice };
        if (maxPrice)
            where.price = { ...where.price, lte: maxPrice };
        if (search)
            where.OR = [
                { name: { contains: search, mode: 'insensitive' } },
                { description: { contains: search, mode: 'insensitive' } },
            ];
        if (storeId)
            where.storeId = storeId;
        if (inStock)
            where.stock = { gt: 0 };
        if (department)
            where.store = { department: { contains: department, mode: 'insensitive' } };
        if (featured)
            where.isFeatured = true;
        if (sponsored)
            where.isSponsored = true;
        if (minRating)
            where.avgRating = { gte: minRating };
        let orderBy = { createdAt: 'desc' };
        if (sort === 'price_asc')
            orderBy = { price: 'asc' };
        if (sort === 'price_desc')
            orderBy = { price: 'desc' };
        if (sort === 'rating')
            orderBy = { avgRating: 'desc' };
        if (sort === 'popular')
            orderBy = { totalSold: 'desc' };
        const [data, total] = await Promise.all([
            this.prisma.product.findMany({
                where,
                orderBy,
                skip: (page - 1) * limit,
                take: limit,
                include: {
                    images: { where: { isPrimary: true }, take: 1 },
                    store: { select: { name: true, slug: true, isVerified: true } },
                    category: { select: { name: true, slug: true } },
                    brand: { select: { name: true } },
                },
            }),
            this.prisma.product.count({ where }),
        ]);
        return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
    }
    async findOne(slug) {
        const product = await this.prisma.product.findUnique({
            where: { slug },
            include: {
                images: { orderBy: { sortOrder: 'asc' } },
                store: true,
                category: true,
                brand: true,
                reviews: {
                    where: { isApproved: true },
                    include: { user: { select: { firstName: true, lastName: true, avatar: true } } },
                    take: 10,
                    orderBy: { createdAt: 'desc' },
                },
            },
        });
        if (!product)
            throw new common_1.NotFoundException('Produit introuvable');
        await this.prisma.product.update({ where: { slug }, data: { viewCount: { increment: 1 } } });
        return product;
    }
    async create(sellerId, dto, files) {
        const seller = await this.prisma.seller.findUnique({
            where: { id: sellerId },
            include: {
                store: true,
                subscriptions: {
                    where: { isActive: true, endDate: { gt: new Date() } },
                    include: { plan: true },
                    take: 1,
                },
            },
        });
        if (seller.status !== 'APPROVED')
            throw new common_1.ForbiddenException('Votre boutique n\'est pas approuvée');
        const sub = seller.subscriptions[0];
        if (!sub)
            throw new common_1.ForbiddenException('Abonnement requis pour publier des produits');
        if (sub.plan.maxProducts) {
            const count = await this.prisma.product.count({
                where: { storeId: seller.store.id, status: { in: ['PUBLISHED', 'PENDING_REVIEW', 'DRAFT'] } },
            });
            if (count >= sub.plan.maxProducts) {
                throw new common_1.ForbiddenException(`Limite de ${sub.plan.maxProducts} produits atteinte pour votre plan`);
            }
        }
        if (files && files.length > sub.plan.maxImages) {
            throw new common_1.BadRequestException(`Maximum ${sub.plan.maxImages} images pour votre plan`);
        }
        const slug = dto.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') + '-' + Date.now();
        const product = await this.prisma.product.create({
            data: {
                storeId: seller.store.id,
                categoryId: dto.categoryId,
                brandId: dto.brandId || null,
                name: dto.name,
                slug,
                description: dto.description,
                sku: dto.sku || null,
                price: dto.price,
                salePrice: dto.salePrice || null,
                stock: dto.stock || 0,
                sizes: dto.sizes || [],
                colors: dto.colors || [],
                status: 'PENDING_REVIEW',
                isFeatured: sub.plan.tier === 'PREMIUM' || sub.plan.tier === 'ELITE',
                isSponsored: sub.plan.hasAutoSponsored,
            },
        });
        if (files && files.length > 0) {
            const uploadPromises = files.map((file, index) => this.uploadService.uploadImage(file, 'products').then((result) => this.prisma.productImage.create({
                data: {
                    productId: product.id,
                    urlFull: result.urlFull,
                    urlMedium: result.urlMedium,
                    urlThumb: result.urlThumb,
                    publicId: result.publicId,
                    isPrimary: index === 0,
                    sortOrder: index,
                },
            })));
            await Promise.all(uploadPromises);
        }
        return this.prisma.product.findUnique({
            where: { id: product.id },
            include: { images: true },
        });
    }
    async update(productId, sellerId, dto) {
        const product = await this.prisma.product.findFirst({
            where: { id: productId, store: { sellerId } },
        });
        if (!product)
            throw new common_1.NotFoundException('Produit introuvable');
        return this.prisma.product.update({
            where: { id: productId },
            data: { ...dto, status: 'PENDING_REVIEW' },
        });
    }
    async addImages(productId, sellerId, files) {
        const product = await this.prisma.product.findFirst({
            where: { id: productId, store: { sellerId } },
            include: { images: true, store: { include: { seller: { include: { subscriptions: { where: { isActive: true }, include: { plan: true }, take: 1 } } } } } },
        });
        if (!product)
            throw new common_1.NotFoundException('Produit introuvable');
        const maxImages = product.store.seller.subscriptions[0]?.plan?.maxImages || 5;
        const current = product.images.length;
        if (current + files.length > maxImages) {
            throw new common_1.BadRequestException(`Maximum ${maxImages} images autorisées`);
        }
        const uploads = await Promise.all(files.map((file, i) => this.uploadService.uploadImage(file, 'products').then((r) => this.prisma.productImage.create({
            data: { productId, urlFull: r.urlFull, urlMedium: r.urlMedium, urlThumb: r.urlThumb, publicId: r.publicId, isPrimary: current === 0 && i === 0, sortOrder: current + i },
        }))));
        return uploads;
    }
    async deleteImage(imageId, sellerId) {
        const image = await this.prisma.productImage.findFirst({
            where: { id: imageId, product: { store: { sellerId } } },
        });
        if (!image)
            throw new common_1.NotFoundException('Image introuvable');
        await this.uploadService.deleteImage(image.publicId);
        await this.prisma.productImage.delete({ where: { id: imageId } });
        return { message: 'Image supprimée' };
    }
    async approve(productId) {
        return this.prisma.product.update({ where: { id: productId }, data: { status: 'PUBLISHED', rejectionReason: null } });
    }
    async reject(productId, reason) {
        return this.prisma.product.update({ where: { id: productId }, data: { status: 'REJECTED', rejectionReason: reason } });
    }
    async getMyProducts(sellerId, page = 1, limit = 20) {
        const store = await this.prisma.store.findUnique({ where: { sellerId } });
        if (!store)
            throw new common_1.NotFoundException('Boutique introuvable');
        const [data, total] = await Promise.all([
            this.prisma.product.findMany({
                where: { storeId: store.id },
                include: { images: { where: { isPrimary: true }, take: 1 }, category: true },
                skip: (page - 1) * limit,
                take: limit,
                orderBy: { createdAt: 'desc' },
            }),
            this.prisma.product.count({ where: { storeId: store.id } }),
        ]);
        return { data, total, page, limit };
    }
    async getFeatured() {
        return this.prisma.product.findMany({
            where: { status: 'PUBLISHED', isFeatured: true, stock: { gt: 0 } },
            include: { images: { where: { isPrimary: true }, take: 1 }, store: { select: { name: true, slug: true } } },
            orderBy: { viewCount: 'desc' },
            take: 12,
        });
    }
    async findAllAdmin(page = 1, limit = 50) {
        const [data, total] = await Promise.all([
            this.prisma.product.findMany({
                skip: (page - 1) * limit,
                take: limit,
                orderBy: { createdAt: 'desc' },
                include: {
                    images: { where: { isPrimary: true }, take: 1 },
                    store: {
                        include: {
                            seller: {
                                include: {
                                    subscriptions: {
                                        where: { isActive: true, endDate: { gt: new Date() } },
                                        include: { plan: true },
                                        take: 1,
                                    },
                                },
                            },
                        },
                    },
                    category: { select: { name: true, slug: true } },
                },
            }),
            this.prisma.product.count(),
        ]);
        return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
    }
    async toggleFeatured(productId) {
        const product = await this.prisma.product.findUnique({ where: { id: productId } });
        if (!product)
            throw new common_1.NotFoundException('Produit introuvable');
        return this.prisma.product.update({
            where: { id: productId },
            data: { isFeatured: !product.isFeatured },
        });
    }
    async toggleSponsored(productId) {
        const product = await this.prisma.product.findUnique({ where: { id: productId } });
        if (!product)
            throw new common_1.NotFoundException('Produit introuvable');
        return this.prisma.product.update({
            where: { id: productId },
            data: { isSponsored: !product.isSponsored },
        });
    }
};
exports.ProductsService = ProductsService;
exports.ProductsService = ProductsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService, upload_service_1.UploadService])
], ProductsService);
//# sourceMappingURL=products.service.js.map