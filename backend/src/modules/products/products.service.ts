import { Injectable, Logger, ForbiddenException, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UploadService } from '../upload/upload.service';
import { EventsService } from '../events/events.service';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import { NotificationsService } from '../notifications/notifications.service';
import { MailService } from '../mail/mail.service';
import { scanForProhibitedContent } from './content-moderation.util';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { FilterProductsDto } from './dto/filter-products.dto';

const PRODUCT_INCLUDE = {
  images: { orderBy: { sortOrder: 'asc' as const } },
  variants: { where: { isActive: true }, orderBy: { sortOrder: 'asc' as const } },
  store: {
    select: {
      name: true, slug: true, isVerified: true, city: true, department: true, deliveryZones: true,
      seller: { select: { userId: true } },
    },
  },
  category: { select: { name: true, slug: true } },
  brand: { select: { name: true } },
};

@Injectable()
export class ProductsService {
  private readonly logger = new Logger(ProductsService.name);

  constructor(
    private prisma: PrismaService,
    private uploadService: UploadService,
    private eventsService: EventsService,
    private subscriptionsService: SubscriptionsService,
    private notifications: NotificationsService,
    private mail: MailService,
  ) {}

  async findAll(filter: FilterProductsDto) {
    const { brand, minPrice, maxPrice, search, sort, page = 1, limit = 20, storeId, inStock, department, city, featured, sponsored, minRating, hasSale, storeVerified, productType } = filter as any;
    const category = filter.category || filter.categorySlug;

    const baseWhere: any = { status: 'PUBLISHED' };
    baseWhere.productType = productType || { not: 'SERVICE' };
    if (category)  baseWhere.category = { slug: category };
    if (brand)     baseWhere.brand = { slug: brand };
    if (minPrice)  baseWhere.price = { ...baseWhere.price, gte: minPrice };
    if (maxPrice)  baseWhere.price = { ...baseWhere.price, lte: maxPrice };
    if (search)    baseWhere.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } },
    ];
    if (storeId)       baseWhere.storeId = storeId;
    if (inStock)       baseWhere.stock = { gt: 0 };
    if (storeVerified) baseWhere.store  = { ...baseWhere.store, isVerified: true };
    if (featured)  baseWhere.isFeatured = true;
    if (sponsored) baseWhere.isSponsored = true;
    if (minRating) baseWhere.avgRating = { gte: minRating };
    if (hasSale)   baseWhere.salePrice = { not: null };

    let orderBy: any = { createdAt: 'desc' };
    if (sort === 'price_asc')  orderBy = { price: 'asc' };
    if (sort === 'price_desc') orderBy = { price: 'desc' };
    if (sort === 'rating')     orderBy = { avgRating: 'desc' };
    if (sort === 'popular')    orderBy = { totalSold: 'desc' };
    if (sort === 'views')      orderBy = { viewCount: 'desc' };
    if (sort === 'newest')     orderBy = { createdAt: 'desc' };
    if (sort === 'discount')   orderBy = [{ salePrice: 'asc' }, { price: 'desc' }];

    const productInclude = {
      images: { where: { isPrimary: true }, take: 1 },
      variants: { where: { isActive: true }, take: 5, orderBy: { sortOrder: 'asc' as const } },
      store: { select: { name: true, slug: true, isVerified: true, city: true, department: true } },
      category: { select: { name: true, slug: true } },
      brand: { select: { name: true } },
    };

    // Quand un département (et/ou ville) est spécifié : locaux en premier, complétés national
    if (department || city) {
      // Filtre ville (précis) : produit ou boutique dans la même ville
      const cityConditions = city ? [
        { city: { equals: city } },
        { store: { city: { equals: city } } },
      ] : [];
      // Filtre département : produit ou boutique ou zone de livraison
      const deptConditions = department ? [
        { store: { department: { contains: department } } },
        { department:          { contains: department } },
        { store: { deliveryZones: { contains: department } } },
      ] : [];

      const allConditions = [...cityConditions, ...deptConditions];
      const localWhere  = { ...baseWhere, OR: allConditions };
      const skip        = (page - 1) * limit;

      const localProducts = await this.prisma.product.findMany({
        where: localWhere, orderBy, skip: 0, take: limit * 3,
        include: productInclude,
      });

      // Tag isLocal: city match = strong, dept match = medium
      const tagged = localProducts.map((p: any) => {
        const pCity = (p.city || p.store?.city || '').toLowerCase();
        const pDept = (p.department || p.store?.department || '').toLowerCase();
        const matchCity = city && pCity === city.toLowerCase();
        const matchDept = department && pDept.includes(department.toLowerCase());
        return { ...p, isLocal: true, isNearCity: !!matchCity, isNearDept: !matchCity && !!matchDept };
      });

      let data: any[];
      let total: number;

      if (tagged.length >= limit) {
        data  = tagged.slice(skip, skip + limit);
        total = tagged.length;
      } else {
        const localIds      = localProducts.map((p: any) => p.id);
        const remaining     = limit - tagged.length;
        const nationalWhere = { ...baseWhere, id: { notIn: localIds.length ? localIds : undefined } };
        const [national, nationalTotal] = await Promise.all([
          this.prisma.product.findMany({ where: nationalWhere, orderBy, skip: 0, take: remaining, include: productInclude }),
          this.prisma.product.count({ where: nationalWhere }),
        ]);
        data  = page === 1 ? [...tagged, ...national] : national.slice(skip - tagged.length);
        total = tagged.length + nationalTotal;
      }

      return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
    }

    // Sans département : comportement standard
    const [data, total] = await Promise.all([
      this.prisma.product.findMany({ where: baseWhere, orderBy, skip: (page - 1) * limit, take: limit, include: productInclude }),
      this.prisma.product.count({ where: baseWhere }),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findOne(slug: string) {
    const product = await this.prisma.product.findUnique({
      where: { slug },
      include: {
        ...PRODUCT_INCLUDE,
        store: { include: { seller: { select: { userId: true } } } },
        reviews: {
          where: { isApproved: true },
          include: { user: { select: { firstName: true, lastName: true, avatar: true } } },
          take: 10,
          orderBy: { createdAt: 'desc' },
        },
      },
    });
    if (!product) throw new NotFoundException('Produit introuvable');

    await this.prisma.product.update({ where: { slug }, data: { viewCount: { increment: 1 } } });
    return product;
  }

  // ── Vendeur : récupérer un de ses produits par id (page d'édition) ────────
  // findOne(slug) ne convient pas ici : l'id de route utilisé par la page
  // d'édition vendeur est l'uuid du produit, pas son slug.
  async getMyProductById(id: string, userId: string) {
    const product = await this.prisma.product.findFirst({
      where: { id, store: { seller: { userId } } },
      include: PRODUCT_INCLUDE,
    });
    if (!product) throw new NotFoundException('Produit introuvable');
    return product;
  }

  async create(userId: string, dto: CreateProductDto, files: { images?: Express.Multer.File[], variantImages?: Express.Multer.File[] }) {
    const seller = await this.prisma.seller.findUnique({
      where: { userId },
      include: {
        stores: true,
        subscriptions: {
          where: { isActive: true, endDate: { gt: new Date() } },
          include: { plan: true },
          take: 1,
        },
      },
    });

    if (!seller) throw new NotFoundException('Profil vendeur introuvable');
    if (seller.status !== 'APPROVED') throw new ForbiddenException('Votre boutique n\'est pas approuvée');

    let sub = seller.subscriptions[0];
    if (!sub) {
      // Filet de rattrapage : un compte créé avant la mise en place du plan
      // Starter automatique n'a peut-être jamais reçu d'abonnement — on le
      // régularise à la volée plutôt que de bloquer un vendeur qui a pourtant
      // droit à ses 2 produits gratuits.
      const baseline = await this.subscriptionsService.ensureBaselinePlan(seller.id).catch(() => null);
      if (!baseline) throw new ForbiddenException('Abonnement requis pour publier des produits');
      sub = await this.prisma.sellerSubscription.findUnique({ where: { id: baseline.id }, include: { plan: true } }) as any;
    }

    // Select store: use storeId from DTO or fallback to primary
    let store = dto.storeId
      ? seller.stores.find(s => s.id === dto.storeId)
      : seller.stores.find(s => s.isPrimary) ?? seller.stores[0];

    if (!store) throw new ForbiddenException('Boutique introuvable');

    // Quota séparé produits vs services — un plan peut limiter les deux différemment
    const isService = (dto as any).productType === 'SERVICE';
    if (isService) {
      if (sub.plan.maxServices !== null && sub.plan.maxServices !== undefined) {
        const count = await this.prisma.product.count({
          where: { storeId: store.id, productType: 'SERVICE', status: { in: ['PUBLISHED', 'PENDING_REVIEW', 'DRAFT'] } },
        });
        if (count >= sub.plan.maxServices) {
          throw new ForbiddenException(`Limite de ${sub.plan.maxServices} services atteinte pour votre plan`);
        }
      }
    } else if (sub.plan.maxProducts) {
      const count = await this.prisma.product.count({
        where: { storeId: store.id, productType: { not: 'SERVICE' }, status: { in: ['PUBLISHED', 'PENDING_REVIEW', 'DRAFT'] } },
      });
      if (count >= sub.plan.maxProducts) {
        throw new ForbiddenException(`Limite de ${sub.plan.maxProducts} produits atteinte pour votre plan`);
      }
    }

    const mainImages = files.images || [];
    const variantImageFiles = files.variantImages || [];

    if (mainImages.length > sub.plan.maxImages) {
      throw new BadRequestException(`Maximum ${sub.plan.maxImages} images pour votre plan`);
    }

    if (dto.salePrice != null && Number(dto.salePrice) >= Number(dto.price)) {
      throw new BadRequestException('Le prix normal doit être supérieur au prix promo');
    }

    // Parse attributes and variants JSON
    let attributes: any = null;
    if (dto.attributes) {
      try { attributes = JSON.parse(dto.attributes); } catch {}
    }

    const priceTiers = this.normalizePriceTiers(dto.priceTiers);

    let variantInput: any[] = [];
    if (dto.variants) {
      try { variantInput = JSON.parse(dto.variants); } catch {}
    }

    const slug = dto.name.toLowerCase()
      .normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
      + '-' + Date.now();

    // Normalize array fields from FormData (may arrive as comma-string or array)
    const parseSizes  = this.parseArrayField(dto.sizes);
    const parseColors = this.parseArrayField(dto.colors);
    const parseDepts  = this.parseArrayField(dto.deliveryDepts);

    // Détection automatique de contenu potentiellement illicite (armes, drogues,
    // contrefaçon…) — ne bloque jamais seule, force juste une revue admin même
    // pour les types normalement publiés directement (services, etc.).
    const moderation = scanForProhibitedContent(dto.name, dto.subtitle, dto.description);

    const product = await this.prisma.product.create({
      data: {
        storeId:     store.id,
        categoryId:  dto.categoryId,
        brandId:     dto.brandId || null,
        name:        dto.name,
        slug,
        subtitle:    dto.subtitle || null,
        description: dto.description,
        sku:         dto.sku || null,
        price:       dto.price,
        salePrice:   dto.salePrice || null,
        // Les services n'ont pas de stock physique — un stock à 0 par défaut les
        // excluait silencieusement de tous les filtres "stock > 0" (near-you, featured, etc.)
        stock:       isService ? 999999 : (variantInput.length > 0 ? variantInput.reduce((s, v) => s + (v.stock || 0), 0) : (dto.stock || 0)),
        sizes:       parseSizes,
        colors:      parseColors,
        condition:   dto.condition || null,
        hasDelivery: dto.hasDelivery || false,
        deliveryPriceHTG: dto.deliveryPriceHTG || null,
        deliveryDepts: parseDepts,
        city:        dto.city || null,
        department:  dto.department || null,
        address:     (dto as any).address || null,
        attributes:  attributes,
        priceTiers,
        minOrderQty: dto.minOrderQty || 1,
        productType: (dto as any).productType || 'PHYSICAL',
        requiresAppointment: (dto as any).requiresAppointment ?? false,
        serviceConfig: (dto as any).serviceConfig || null,
        priceUnit:   (dto as any).priceUnit || null,
        isFlagged:   moderation.isFlagged,
        flagReason:  moderation.reason,
        // Services/RE/Freelance sont publiés directement ; produits physiques
        // passent en révision ; un contenu suspect force la révision dans tous les cas.
        status:      moderation.isFlagged
                       ? 'PENDING_REVIEW'
                       : (dto as any).productType && (dto as any).productType !== 'PHYSICAL'
                       ? 'PUBLISHED'
                       : 'PENDING_REVIEW',
        isFeatured:  sub.plan.tier === 'PREMIUM' || sub.plan.tier === 'ELITE',
        isSponsored: sub.plan.hasAutoSponsored,
      } as any,
    });

    // Upload main images
    if (mainImages.length > 0) {
      const uploadPromises = mainImages.map((file, index) =>
        this.uploadService.uploadImage(file, 'products').then(r =>
          this.prisma.productImage.create({
            data: {
              productId: product.id,
              urlFull:   r.urlFull,
              urlMedium: r.urlMedium,
              urlThumb:  r.urlThumb,
              publicId:  r.publicId,
              isPrimary: index === 0,
              sortOrder: index,
            },
          }),
        ),
      );
      await Promise.all(uploadPromises);
    }

    // Create variants (optionally upload variant images)
    if (variantInput.length > 0) {
      const variantCreateData = await Promise.all(
        variantInput.map(async (v, sortOrder) => {
          let imageUrl: string | null = null;
          let imagePublicId: string | null = null;

          if (typeof v.imageFileIndex === 'number' && variantImageFiles[v.imageFileIndex]) {
            try {
              const r = await this.uploadService.uploadImage(variantImageFiles[v.imageFileIndex], 'product-variants');
              imageUrl      = r.urlMedium; // Use medium size for variant images
              imagePublicId = r.publicId;
            } catch {}
          }

          return {
            productId:     product.id,
            color:         v.color || null,
            colorHex:      v.colorHex || null,
            size:          v.size || null,
            stock:         v.stock || 0,
            priceOverride: v.priceOverride ? parseFloat(v.priceOverride) : null,
            imageUrl,
            imagePublicId,
            sku:           v.sku || null,
            sortOrder,
            isActive:      true,
          };
        }),
      );

      await this.prisma.productVariant.createMany({ data: variantCreateData });
    }

    return this.prisma.product.findUnique({
      where: { id: product.id },
      include: PRODUCT_INCLUDE,
    });
  }

  async update(productId: string, userId: string, dto: UpdateProductDto, files?: { images?: Express.Multer.File[], variantImages?: Express.Multer.File[] }) {
    const product = await this.prisma.product.findFirst({
      where: { id: productId, store: { seller: { userId } } },
    });
    if (!product) throw new NotFoundException('Produit introuvable');

    // Produit déjà PUBLISHED → la version en ligne reste visible et intacte
    // pendant la validation. On stocke seulement les changements proposés ;
    // rien n'est appliqué (ni prix, ni stock, ni images/variants) tant que
    // l'admin n'a pas approuvé — voir approveEdit()/rejectEdit().
    if (product.status === 'PUBLISHED') {
      return this.savePendingEdit(product, userId, dto, files);
    }

    // Record price history + notify wishlist users if price dropped
    const newPrice     = dto.price     != null ? Number(dto.price)     : null;
    const newSalePrice = (dto as any).salePrice != null ? Number((dto as any).salePrice) : null;
    const oldPrice     = Number(product.price);
    const oldSalePrice = product.salePrice ? Number(product.salePrice) : null;
    const priceChanged = (newPrice != null && newPrice !== oldPrice) ||
                         (newSalePrice !== oldSalePrice);

    const effPrice     = newPrice ?? oldPrice;
    const effSalePrice = newSalePrice ?? oldSalePrice;
    if (effSalePrice != null && effSalePrice >= effPrice) {
      throw new BadRequestException('Le prix normal doit être supérieur au prix promo');
    }

    if (priceChanged) {
      await (this.prisma as any).priceHistory.create({
        data: {
          productId,
          price:     newPrice     ?? oldPrice,
          salePrice: newSalePrice ?? oldSalePrice ?? null,
        },
      });
      // Check if effective price dropped (salePrice preferred)
      const oldEff = oldSalePrice ?? oldPrice;
      const newEff = newSalePrice ?? newPrice ?? oldPrice;
      if (oldEff > 0 && newEff < oldEff) {
        const wishlistUsers = await this.prisma.wishlistItem.findMany({
          where: { productId },
          select: { userId: true },
        });
        const discount = Math.round((1 - newEff / oldEff) * 100);
        await Promise.all(wishlistUsers.map(w =>
          this.prisma.notification.create({
            data: {
              userId: w.userId,
              title:  `💰 Baisse de prix !`,
              body:   `"${product.name}" est maintenant ${discount}% moins cher.`,
              type:   'PRICE_DROP',
              data:   JSON.stringify({ productId, productSlug: product.slug, discount, newPrice: newEff, oldPrice: oldEff }) as any,
            },
          }).catch(() => {}),
        ));
      }
    }

    let attributes: any = undefined;
    if ((dto as any).attributes) {
      try { attributes = JSON.parse((dto as any).attributes); } catch {}
    }

    const variantInput: any[] = [];
    if ((dto as any).variants) {
      try { variantInput.push(...JSON.parse((dto as any).variants)); } catch {}
    }

    // storeId must never be reassigned via update — ownership is fixed at creation
    const { storeId: _ignoredStoreId, priceTiers: _rawPriceTiers, ...safeDto } = dto as any;
    const priceTiers = _rawPriceTiers !== undefined ? this.normalizePriceTiers(_rawPriceTiers) : undefined;

    const moderation = scanForProhibitedContent(
      (dto as any).name ?? product.name,
      (dto as any).subtitle ?? (product as any).subtitle,
      (dto as any).description ?? product.description,
    );

    await this.prisma.product.update({
      where: { id: productId },
      data: {
        ...safeDto,
        attributes: attributes !== undefined ? attributes : undefined,
        priceTiers,
        variants: undefined,
        status: 'PENDING_REVIEW',
        isFlagged: moderation.isFlagged,
        flagReason: moderation.reason,
      } as any,
    });

    // Replace variants if sent
    if (variantInput.length > 0) {
      await this.prisma.productVariant.deleteMany({ where: { productId } });
      const variantImageFiles = files?.variantImages || [];
      const variantCreateData = await Promise.all(
        variantInput.map(async (v, sortOrder) => {
          let imageUrl: string | null = null;
          let imagePublicId: string | null = null;
          if (typeof v.imageFileIndex === 'number' && variantImageFiles[v.imageFileIndex]) {
            try {
              const r = await this.uploadService.uploadImage(variantImageFiles[v.imageFileIndex], 'product-variants');
              imageUrl = r.urlMedium; imagePublicId = r.publicId;
            } catch {}
          } else if (v.imageUrl) {
            imageUrl = v.imageUrl; imagePublicId = v.imagePublicId || null;
          }
          return { productId, color: v.color || null, colorHex: v.colorHex || null, size: v.size || null, stock: v.stock || 0, priceOverride: v.priceOverride || null, imageUrl, imagePublicId, sku: v.sku || null, sortOrder, isActive: true };
        }),
      );
      await this.prisma.productVariant.createMany({ data: variantCreateData });
    }

    // La modification repasse le produit en file de modération — le vendeur
    // doit le savoir immédiatement, pas seulement constater sa disparition.
    await this.notifications.create(
      userId,
      `🔍 "${(dto as any).name ?? product.name}" en cours de vérification`,
      `Votre modification a bien été enregistrée. Le produit repasse en file de modération et sera republié après validation.`,
      'PRODUCT_MODERATION',
      { productId, result: 'PENDING' },
    ).catch(() => {});

    return this.prisma.product.findUnique({ where: { id: productId }, include: PRODUCT_INCLUDE });
  }

  async addImages(productId: string, userId: string, files: Express.Multer.File[]) {
    const product = await this.prisma.product.findFirst({
      where: { id: productId, store: { seller: { userId } } },
      include: {
        images: true,
        store: { include: { seller: { include: { subscriptions: { where: { isActive: true }, include: { plan: true }, take: 1 } } } } },
      },
    });
    if (!product) throw new NotFoundException('Produit introuvable');

    const maxImages = product.store.seller.subscriptions[0]?.plan?.maxImages || 5;
    const current = product.images.length;
    if (current + files.length > maxImages) throw new BadRequestException(`Maximum ${maxImages} images autorisées`);

    const uploads = await Promise.all(
      files.map((file, i) =>
        this.uploadService.uploadImage(file, 'products').then(r =>
          this.prisma.productImage.create({
            data: { productId, urlFull: r.urlFull, urlMedium: r.urlMedium, urlThumb: r.urlThumb, publicId: r.publicId, isPrimary: current === 0 && i === 0, sortOrder: current + i },
          }),
        ),
      ),
    );
    return uploads;
  }

  async deleteImage(imageId: string, userId: string) {
    const image = await this.prisma.productImage.findFirst({
      where: { id: imageId, product: { store: { seller: { userId } } } },
    });
    if (!image) throw new NotFoundException('Image introuvable');

    await this.uploadService.deleteImage(image.publicId);
    await this.prisma.productImage.delete({ where: { id: imageId } });
    return { message: 'Image supprimée' };
  }

  async deleteVariant(variantId: string, userId: string) {
    const variant = await this.prisma.productVariant.findFirst({
      where: { id: variantId, product: { store: { seller: { userId } } } },
    });
    if (!variant) throw new NotFoundException('Variante introuvable');

    if (variant.imagePublicId) {
      try { await this.uploadService.deleteImage(variant.imagePublicId); } catch {}
    }
    return this.prisma.productVariant.delete({ where: { id: variantId } });
  }

  async getMyProducts(userId: string, page = 1, limit = 20) {
    const seller = await this.prisma.seller.findUnique({ where: { userId }, include: { stores: true } });
    if (!seller || seller.stores.length === 0) throw new NotFoundException('Boutique introuvable');

    const storeIds = seller.stores.map(s => s.id);

    const [data, total] = await Promise.all([
      this.prisma.product.findMany({
        where: { storeId: { in: storeIds } },
        include: {
          images: { where: { isPrimary: true }, take: 1 },
          variants: { where: { isActive: true }, take: 10, orderBy: { sortOrder: 'asc' } },
          category: true,
          store: { select: { id: true, name: true, isPrimary: true } },
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.product.count({ where: { storeId: { in: storeIds } } }),
    ]);

    return { data, total, page, limit };
  }

  async getFeatured() {
    return this.prisma.product.findMany({
      where: { status: 'PUBLISHED', isFeatured: true, stock: { gt: 0 } },
      include: {
        images: { where: { isPrimary: true }, take: 1 },
        variants: { where: { isActive: true }, take: 5, orderBy: { sortOrder: 'asc' } },
        store: { select: { name: true, slug: true } },
      },
      orderBy: { viewCount: 'desc' },
      take: 12,
    });
  }

  async findAllAdmin(page = 1, limit = 50, status?: string) {
    const where: { status?: any } = {};
    if (status) where.status = status;

    const [data, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        skip: (page - 1) * limit, take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          images: { where: { isPrimary: true }, take: 1 },
          store: { include: { seller: { include: { subscriptions: { where: { isActive: true, endDate: { gt: new Date() } }, include: { plan: true }, take: 1 } } } } },
          category: { select: { name: true, slug: true } },
        },
      }),
      this.prisma.product.count({ where }),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async approve(productId: string) {
    const product = await this.prisma.product.update({
      where: { id: productId }, data: { status: 'PUBLISHED', rejectionReason: null },
      include: { store: { select: { name: true, seller: { select: { userId: true } } } } },
    });
    await this.notifyModerationResult(product, 'APPROVED');
    return product;
  }

  async reject(productId: string, reason: string) {
    const product = await this.prisma.product.update({
      where: { id: productId }, data: { status: 'REJECTED', rejectionReason: reason },
      include: { store: { select: { name: true, seller: { select: { userId: true } } } } },
    });
    await this.notifyModerationResult(product, 'REJECTED', reason);
    return product;
  }

  // ── Notifie le vendeur du résultat de la modération (approbation/rejet) ────
  private async notifyModerationResult(product: any, result: 'APPROVED' | 'REJECTED', reason?: string) {
    const sellerUserId = product?.store?.seller?.userId;
    if (!sellerUserId) return;

    const isApproved = result === 'APPROVED';
    const title = isApproved
      ? `✅ "${product.name}" est en ligne`
      : `❌ "${product.name}" a été refusé`;
    const body = isApproved
      ? `Votre produit/service a été validé et est maintenant visible sur DealPam.`
      : `Votre produit/service n'a pas été approuvé.${reason ? ` Raison : ${reason}` : ''}`;

    await this.notifications.create(sellerUserId, title, body, 'PRODUCT_MODERATION', { productId: product.id, result, reason }).catch(() => {});

    const user = await this.prisma.user.findUnique({ where: { id: sellerUserId }, select: { email: true } });
    if (user?.email) {
      this.mail.sendRaw(user.email, title, `${body}<br/><br/>Boutique : ${product.store?.name ?? ''}`, 'seller').catch(() => {});
    }
  }

  async toggleFeatured(productId: string) {
    const product = await this.prisma.product.findUnique({ where: { id: productId } });
    if (!product) throw new NotFoundException('Produit introuvable');
    return this.prisma.product.update({ where: { id: productId }, data: { isFeatured: !product.isFeatured } });
  }

  async toggleSponsored(productId: string) {
    const product = await this.prisma.product.findUnique({ where: { id: productId } });
    if (!product) throw new NotFoundException('Produit introuvable');
    return this.prisma.product.update({ where: { id: productId }, data: { isSponsored: !product.isSponsored } });
  }

  async boostProduct(productId: string, opts: { days?: number; isSponsored?: boolean; isFeatured?: boolean }) {
    const product = await this.prisma.product.findUnique({ where: { id: productId } });
    if (!product) throw new NotFoundException('Produit introuvable');
    const data: any = {};
    if (opts.isSponsored !== undefined) data.isSponsored = opts.isSponsored;
    if (opts.isFeatured  !== undefined) data.isFeatured  = opts.isFeatured;
    if (opts.days && opts.days > 0) {
      const until = new Date();
      until.setDate(until.getDate() + opts.days);
      data.sponsoredUntil = until;
    }
    return this.prisma.product.update({ where: { id: productId }, data });
  }

  private parseArrayField(val: string | string[] | undefined): string[] {
    if (!val) return [];
    if (Array.isArray(val)) return val.filter(Boolean);
    try { const p = JSON.parse(val); if (Array.isArray(p)) return p; } catch {}
    return val.split(',').map(s => s.trim()).filter(Boolean);
  }

  // ── Admin : file des modifications en attente de validation ───────────────
  async findPendingEdits() {
    return (this.prisma.product as any).findMany({
      where: { hasPendingEdit: true },
      include: { store: { select: { name: true, slug: true } } },
      orderBy: { updatedAt: 'desc' },
    });
  }

  // ── Modification d'un produit déjà publié : stocke sans rien appliquer ────
  private async savePendingEdit(
    product: any, userId: string, dto: UpdateProductDto,
    files?: { images?: Express.Multer.File[], variantImages?: Express.Multer.File[] },
  ) {
    if (dto.salePrice != null && Number(dto.salePrice) >= Number(dto.price ?? product.price)) {
      throw new BadRequestException('Le prix normal doit être supérieur au prix promo');
    }

    const { storeId: _ignoredStoreId, priceTiers: rawPriceTiers, ...safeDto } = dto as any;
    const priceTiers = rawPriceTiers !== undefined ? this.normalizePriceTiers(rawPriceTiers) : undefined;

    let attributes: any = undefined;
    if ((dto as any).attributes) {
      try { attributes = JSON.parse((dto as any).attributes); } catch {}
    }
    let variants: any[] | undefined;
    if ((dto as any).variants) {
      try { variants = JSON.parse((dto as any).variants); } catch {}
    }

    // Note : les fichiers (nouvelles images) ne sont pas pris en charge dans une
    // édition en attente pour l'instant — seuls les champs texte/prix/stock/
    // bundles sont différés. Un vendeur qui doit changer ses photos doit passer
    // par les endpoints images dédiés (addImages/deleteImage), non affectés ici.
    const pendingChanges = JSON.stringify({ ...safeDto, attributes, priceTiers, variants });

    await this.prisma.product.update({
      where: { id: product.id },
      data: { hasPendingEdit: true, pendingChanges, pendingRejectionReason: null } as any,
    });

    await this.notifications.create(
      userId,
      `🔍 Modification de "${(dto as any).name ?? product.name}" en cours de vérification`,
      `Votre produit reste visible tel quel pendant que la modification est examinée. Vous serez notifié dès qu'elle sera approuvée ou refusée.`,
      'PRODUCT_MODERATION',
      { productId: product.id, result: 'PENDING_EDIT' },
    ).catch(() => {});

    return this.prisma.product.findUnique({ where: { id: product.id }, include: PRODUCT_INCLUDE });
  }

  // ── Admin : approuver une modification en attente — applique enfin les changements ─
  async approveEdit(productId: string) {
    const product = await this.prisma.product.findUnique({ where: { id: productId } });
    if (!product) throw new NotFoundException('Produit introuvable');
    if (!(product as any).hasPendingEdit || !(product as any).pendingChanges) {
      throw new BadRequestException('Aucune modification en attente pour ce produit');
    }

    let changes: any;
    try { changes = JSON.parse((product as any).pendingChanges); } catch {
      throw new BadRequestException('Modification en attente corrompue');
    }
    const { variants, ...fieldChanges } = changes;

    const updated = await this.prisma.product.update({
      where: { id: productId },
      data: {
        ...fieldChanges,
        hasPendingEdit: false,
        pendingChanges: null,
        pendingRejectionReason: null,
      } as any,
      include: { store: { select: { name: true, seller: { select: { userId: true } } } } },
    });

    if (Array.isArray(variants) && variants.length > 0) {
      await this.prisma.productVariant.deleteMany({ where: { productId } });
      await this.prisma.productVariant.createMany({
        data: variants.map((v: any, sortOrder: number) => ({
          productId, color: v.color || null, colorHex: v.colorHex || null, size: v.size || null,
          stock: v.stock || 0, priceOverride: v.priceOverride || null, imageUrl: v.imageUrl || null,
          imagePublicId: v.imagePublicId || null, sku: v.sku || null, sortOrder, isActive: true,
        })),
      });
    }

    await this.notifyModerationResult(updated, 'APPROVED');
    return updated;
  }

  // ── Admin : refuser une modification en attente — la version live ne bouge pas ─
  async rejectEdit(productId: string, reason: string) {
    const product = await this.prisma.product.update({
      where: { id: productId },
      data: { hasPendingEdit: false, pendingChanges: null, pendingRejectionReason: reason } as any,
      include: { store: { select: { name: true, seller: { select: { userId: true } } } } },
    });
    await this.notifyModerationResult(product, 'REJECTED', reason);
    return product;
  }

  // ── Paliers de prix dégressifs (bundles) ──────────────────────────────────
  // Valide + normalise le JSON envoyé par le vendeur : [{"minQty":1,"price":500},...].
  // Trié par minQty croissant, jamais négatif, jamais un doublon de palier.
  // Retourne null si aucun palier fourni (produit sans bundle, cas normal).
  private normalizePriceTiers(raw: string | undefined): string | null {
    if (!raw) return null;
    let tiers: any[];
    try { tiers = JSON.parse(raw); } catch { throw new BadRequestException('Paliers de prix invalides (JSON malformé)'); }
    if (!Array.isArray(tiers) || tiers.length === 0) return null;

    const clean = tiers.map(t => ({ minQty: Number(t.minQty), price: Number(t.price) }));
    for (const t of clean) {
      if (!Number.isInteger(t.minQty) || t.minQty < 1) throw new BadRequestException('Quantité de palier invalide (doit être un entier ≥ 1)');
      if (!Number.isFinite(t.price) || t.price < 0) throw new BadRequestException('Prix de palier invalide');
    }
    clean.sort((a, b) => a.minQty - b.minQty);
    const seenQty = new Set<number>();
    for (const t of clean) {
      if (seenQty.has(t.minQty)) throw new BadRequestException(`Palier en double pour la quantité ${t.minQty}`);
      seenQty.add(t.minQty);
    }
    return JSON.stringify(clean);
  }

  // ── Intelligent recommendations engine ────────────────────────────────────
  async getRecommendations(opts: {
    ids: string[];          // recently viewed product IDs
    department?: string;
    categoryId?: string;
    limit: number;
  }) {
    const { ids, department, categoryId, limit } = opts;

    // Step 1: Get category affinity from viewed products
    let affinityCategoryIds: string[] = [];
    if (ids.length > 0) {
      const viewedProducts = await this.prisma.product.findMany({
        where:  { id: { in: ids.slice(0, 20) } },
        select: { categoryId: true },
      });
      const catCounts: Record<string, number> = {};
      viewedProducts.forEach(p => {
        if (p.categoryId) catCounts[p.categoryId] = (catCounts[p.categoryId] || 0) + 1;
      });
      affinityCategoryIds = Object.entries(catCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([id]) => id);
    }
    if (categoryId) affinityCategoryIds = [...new Set([categoryId, ...affinityCategoryIds])];

    const where: any = {
      status: 'PUBLISHED',
      id:     { notIn: ids.length ? ids : undefined },
      stock:  { gt: 0 },
    };
    if (department) where.store = { department };

    // Priority 1: products from affinity categories in user's region
    if (affinityCategoryIds.length > 0) {
      const local = await this.prisma.product.findMany({
        where:   { ...where, categoryId: { in: affinityCategoryIds } },
        include: PRODUCT_INCLUDE,
        orderBy: [{ isSponsored: 'desc' }, { avgRating: 'desc' }, { createdAt: 'desc' }],
        take:    Math.ceil(limit * 0.6),
      });

      if (local.length >= limit) return local.slice(0, limit);

      // Fill remainder with popular from same region
      const fill = await this.prisma.product.findMany({
        where:   { ...where, id: { notIn: [...ids, ...local.map(p => p.id)] } },
        include: PRODUCT_INCLUDE,
        orderBy: [{ avgRating: 'desc' }, { viewCount: 'desc' }],
        take:    limit - local.length,
      });
      return [...local, ...fill];
    }

    // No history: return geo-popular products
    return this.prisma.product.findMany({
      where,
      include: PRODUCT_INCLUDE,
      orderBy: [{ isSponsored: 'desc' }, { isFeatured: 'desc' }, { avgRating: 'desc' }],
      take:    limit,
    });
  }

  // ── Produits près de l'utilisateur — fallback progressif ─────────────────
  async getNearProducts(department: string, city: string, limit = 20): Promise<{
    products: any[]; level: 'city' | 'department' | 'national'; label: string;
  }> {
    const base = { status: 'PUBLISHED' as any, stock: { gt: 0 }, productType: { not: 'SERVICE' as any } };

    // Fetch a wide pool with store info (including deliveryDepts)
    const all = await this.prisma.product.findMany({
      where: base,
      include: PRODUCT_INCLUDE,
      orderBy: [{ isSponsored: 'desc' }, { avgRating: 'desc' }, { viewCount: 'desc' }],
      take: 200,
    });

    const deptNorm = department.trim().toLowerCase();
    const cityNorm = city?.trim().toLowerCase() ?? '';

    const matchesDept = (p: any): boolean => {
      const storeDept = p.store?.department?.toLowerCase() ?? '';
      const prodDept  = (p as any).department?.toLowerCase() ?? '';
      let deliveryZones: string[] = [];
      try { deliveryZones = JSON.parse(p.store?.deliveryZones ?? '[]').map((d: string) => d.toLowerCase()); } catch {}
      return storeDept === deptNorm || prodDept === deptNorm || deliveryZones.includes(deptNorm);
    };

    const matchesCity = (p: any): boolean => {
      if (!cityNorm) return false;
      const storeCity = p.store?.city?.toLowerCase() ?? '';
      const prodCity  = (p as any).city?.toLowerCase() ?? '';
      return storeCity.includes(cityNorm) || prodCity.includes(cityNorm);
    };

    // Niveau 1 : ville exacte dans département couvert
    if (cityNorm) {
      const byCity = all.filter(p => matchesDept(p) && matchesCity(p));
      if (byCity.length >= 1) return {
        products: byCity.slice(0, limit),
        level: 'city' as const,
        label: `Produits disponibles a ${city}`,
      };
    }

    // Niveau 2 : département (vendeur présent OU livre là)
    const byDept = all.filter(p => matchesDept(p));
    if (byDept.length >= 1) return {
      products: byDept.slice(0, limit),
      level: 'department' as const,
      label: `Produits disponibles en ${department}`,
    };

    // Niveau 3 : national
    return {
      products: all.slice(0, limit),
      level: 'national' as const,
      label: 'Produits populaires en Haiti',
    };
  }

  // ── Trending categories by department ─────────────────────────────────────
  async getTrendingCategories(department?: string) {
    // Get categories with most products in the specified region
    const where: any = { status: 'PUBLISHED', stock: { gt: 0 } };
    if (department) where.store = { department };

    const products = await this.prisma.product.groupBy({
      by:      ['categoryId'],
      where,
      _count:  { _all: true },
      _avg:    { avgRating: true },
      orderBy: { _count: { categoryId: 'desc' } },
      take:    8,
    });

    const categoryIds = products.map(p => p.categoryId).filter(Boolean) as string[];
    const categories  = await this.prisma.category.findMany({
      where: { id: { in: categoryIds } },
      select: { id: true, name: true, slug: true },
    });

    return products.map(p => {
      const cat = categories.find(c => c.id === p.categoryId);
      return { ...cat, productCount: p._count._all, avgRating: p._avg.avgRating };
    }).filter(p => p.id);
  }

  async getPersonalized(userId: string | null, sessionId: string, limit = 12) {
    const topCategories = await this.eventsService.getTopCategories(userId || undefined, sessionId);
    if (topCategories.length === 0) {
      // Fallback: return popular products
      return this.prisma.product.findMany({
        where:   { status: 'PUBLISHED' },
        include: PRODUCT_INCLUDE,
        orderBy: [{ viewCount: 'desc' }, { avgRating: 'desc' }],
        take:    limit,
      });
    }
    const cats = await this.prisma.category.findMany({
      where: { slug: { in: topCategories } },
      select: { id: true },
    });
    const catIds = cats.map(c => c.id);
    return this.prisma.product.findMany({
      where:   { status: 'PUBLISHED', categoryId: { in: catIds } },
      include: PRODUCT_INCLUDE,
      orderBy: [{ viewCount: 'desc' }, { avgRating: 'desc' }],
      take:    limit,
    });
  }
}
