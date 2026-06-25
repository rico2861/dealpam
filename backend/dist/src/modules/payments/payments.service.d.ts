import { PrismaService } from '../../prisma/prisma.service';
export declare class PaymentsService {
    private prisma;
    constructor(prisma: PrismaService);
    findAll(page?: number): import(".prisma/client").Prisma.PrismaPromise<({
        order: {
            user: {
                firstName: string;
                lastName: string;
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
        };
    } & {
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
    })[]>;
    initiate(orderId: string, method: string, amountHTG: number): Promise<{
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
    }>;
    confirm(transactionId: string, gatewayData?: any): Promise<import(".prisma/client").Prisma.BatchPayload>;
}
