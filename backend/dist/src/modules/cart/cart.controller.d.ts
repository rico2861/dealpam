import { CartService } from './cart.service';
export declare class CartController {
    private cs;
    constructor(cs: CartService);
    get(u: any): Promise<{
        total: any;
        items: ({
            product: {
                store: {
                    name: string;
                    slug: string;
                };
                images: {
                    id: string;
                    createdAt: Date;
                    sortOrder: number;
                    productId: string;
                    urlFull: string;
                    urlMedium: string;
                    urlThumb: string;
                    publicId: string;
                    isPrimary: boolean;
                }[];
            } & {
                id: string;
                name: string;
                description: string;
                createdAt: Date;
                updatedAt: Date;
                slug: string;
                city: string | null;
                department: string | null;
                status: import(".prisma/client").$Enums.ProductStatus;
                rejectionReason: string | null;
                avgRating: number;
                totalReviews: number;
                sku: string | null;
                productType: import(".prisma/client").$Enums.ProductType;
                price: import("@prisma/client/runtime/library").Decimal;
                salePrice: import("@prisma/client/runtime/library").Decimal | null;
                stock: number;
                sizes: string[];
                colors: string[];
                hasDelivery: boolean;
                deliveryPriceHTG: import("@prisma/client/runtime/library").Decimal | null;
                deliveryDepts: string[];
                year: number | null;
                mileage: number | null;
                condition: string | null;
                requiresAppointment: boolean;
                isFeatured: boolean;
                isSponsored: boolean;
                totalSold: number;
                viewCount: number;
                storeId: string;
                categoryId: string;
                brandId: string | null;
            };
        } & {
            id: string;
            productId: string;
            cartId: string;
            quantity: number;
            size: string | null;
            color: string | null;
        })[];
        id: string;
        updatedAt: Date;
        userId: string;
    }>;
    add(u: any, b: any): Promise<{
        id: string;
        productId: string;
        cartId: string;
        quantity: number;
        size: string | null;
        color: string | null;
    }>;
    update(u: any, id: string, q: number): Promise<{
        id: string;
        productId: string;
        cartId: string;
        quantity: number;
        size: string | null;
        color: string | null;
    }>;
    remove(u: any, id: string): Promise<{
        message: string;
    }>;
    clear(u: any): Promise<{
        message: string;
    }>;
}
