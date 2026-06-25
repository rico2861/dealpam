import { OrdersService } from './orders.service';
export declare class OrdersController {
    private os;
    constructor(os: OrdersService);
    create(u: any, b: any): Promise<any[]>;
    getMyOrders(u: any, p: number): import(".prisma/client").Prisma.PrismaPromise<({
        store: {
            name: string;
            slug: string;
            logoUrl: string;
        };
        payment: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            status: import(".prisma/client").$Enums.PaymentStatus;
            orderId: string | null;
            subscriptionId: string | null;
            method: import(".prisma/client").$Enums.PaymentMethod;
            amountHTG: import("@prisma/client/runtime/library").Decimal;
            transactionId: string | null;
            gatewayData: import("@prisma/client/runtime/library").JsonValue | null;
            paidAt: Date | null;
        };
        items: {
            id: string;
            imageUrl: string | null;
            productId: string;
            quantity: number;
            productName: string;
            unitPrice: import("@prisma/client/runtime/library").Decimal;
            subtotal: import("@prisma/client/runtime/library").Decimal;
            orderId: string;
        }[];
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: import(".prisma/client").$Enums.OrderStatus;
        userId: string;
        storeId: string;
        subtotalHTG: import("@prisma/client/runtime/library").Decimal;
        shippingHTG: import("@prisma/client/runtime/library").Decimal;
        totalHTG: import("@prisma/client/runtime/library").Decimal;
        notes: string | null;
        trackingNumber: string | null;
        addressId: string;
    })[]>;
    getOne(u: any, id: string): Promise<{
        store: {
            id: string;
            name: string;
            description: string | null;
            isActive: boolean;
            createdAt: Date;
            updatedAt: Date;
            slug: string;
            email: string | null;
            phone: string | null;
            city: string | null;
            department: string | null;
            address: string | null;
            logoUrl: string | null;
            bannerUrl: string | null;
            whatsapp: string | null;
            avgRating: number;
            totalReviews: number;
            totalSales: number;
            isVerified: boolean;
            badges: string[];
            reputationScore: number;
            avgResponseTime: number | null;
            lastBadgeUpdate: Date | null;
            sellerId: string;
        };
        address: {
            id: string;
            createdAt: Date;
            phone: string;
            city: string;
            department: string;
            userId: string;
            label: string;
            fullName: string;
            line1: string;
            isDefault: boolean;
        };
        payment: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            status: import(".prisma/client").$Enums.PaymentStatus;
            orderId: string | null;
            subscriptionId: string | null;
            method: import(".prisma/client").$Enums.PaymentMethod;
            amountHTG: import("@prisma/client/runtime/library").Decimal;
            transactionId: string | null;
            gatewayData: import("@prisma/client/runtime/library").JsonValue | null;
            paidAt: Date | null;
        };
        items: ({
            product: {
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
            imageUrl: string | null;
            productId: string;
            quantity: number;
            productName: string;
            unitPrice: import("@prisma/client/runtime/library").Decimal;
            subtotal: import("@prisma/client/runtime/library").Decimal;
            orderId: string;
        })[];
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: import(".prisma/client").$Enums.OrderStatus;
        userId: string;
        storeId: string;
        subtotalHTG: import("@prisma/client/runtime/library").Decimal;
        shippingHTG: import("@prisma/client/runtime/library").Decimal;
        totalHTG: import("@prisma/client/runtime/library").Decimal;
        notes: string | null;
        trackingNumber: string | null;
        addressId: string;
    }>;
    getSellerOrders(u: any, p: number): import(".prisma/client").Prisma.PrismaPromise<({
        user: {
            firstName: string;
            lastName: string;
        };
        items: {
            id: string;
            imageUrl: string | null;
            productId: string;
            quantity: number;
            productName: string;
            unitPrice: import("@prisma/client/runtime/library").Decimal;
            subtotal: import("@prisma/client/runtime/library").Decimal;
            orderId: string;
        }[];
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: import(".prisma/client").$Enums.OrderStatus;
        userId: string;
        storeId: string;
        subtotalHTG: import("@prisma/client/runtime/library").Decimal;
        shippingHTG: import("@prisma/client/runtime/library").Decimal;
        totalHTG: import("@prisma/client/runtime/library").Decimal;
        notes: string | null;
        trackingNumber: string | null;
        addressId: string;
    })[]>;
    updateSellerOrder(id: string, u: any, s: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: import(".prisma/client").$Enums.OrderStatus;
        userId: string;
        storeId: string;
        subtotalHTG: import("@prisma/client/runtime/library").Decimal;
        shippingHTG: import("@prisma/client/runtime/library").Decimal;
        totalHTG: import("@prisma/client/runtime/library").Decimal;
        notes: string | null;
        trackingNumber: string | null;
        addressId: string;
    }>;
    findAll(p: number): import(".prisma/client").Prisma.PrismaPromise<({
        user: {
            email: string;
            firstName: string;
            lastName: string;
        };
        store: {
            name: string;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: import(".prisma/client").$Enums.OrderStatus;
        userId: string;
        storeId: string;
        subtotalHTG: import("@prisma/client/runtime/library").Decimal;
        shippingHTG: import("@prisma/client/runtime/library").Decimal;
        totalHTG: import("@prisma/client/runtime/library").Decimal;
        notes: string | null;
        trackingNumber: string | null;
        addressId: string;
    })[]>;
    updateStatus(id: string, s: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: import(".prisma/client").$Enums.OrderStatus;
        userId: string;
        storeId: string;
        subtotalHTG: import("@prisma/client/runtime/library").Decimal;
        shippingHTG: import("@prisma/client/runtime/library").Decimal;
        totalHTG: import("@prisma/client/runtime/library").Decimal;
        notes: string | null;
        trackingNumber: string | null;
        addressId: string;
    }>;
}
