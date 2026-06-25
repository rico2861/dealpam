import { PrismaService } from '../../prisma/prisma.service';
import { ComplaintType } from '@prisma/client';
export declare class ComplaintsService {
    private prisma;
    constructor(prisma: PrismaService);
    create(userId: string, dto: {
        type: ComplaintType;
        subject: string;
        description: string;
        orderId?: string;
        sellerId?: string;
        productId?: string;
    }): Promise<{
        user: {
            id: string;
            email: string;
            firstName: string;
            lastName: string;
        };
    } & {
        id: string;
        description: string;
        createdAt: Date;
        updatedAt: Date;
        status: import(".prisma/client").$Enums.ComplaintStatus;
        userId: string;
        sellerId: string | null;
        productId: string | null;
        orderId: string | null;
        type: import(".prisma/client").$Enums.ComplaintType;
        subject: string;
        adminNote: string | null;
        resolvedAt: Date | null;
        resolvedBy: string | null;
    }>;
    findForUser(userId: string): Promise<{
        id: string;
        description: string;
        createdAt: Date;
        updatedAt: Date;
        status: import(".prisma/client").$Enums.ComplaintStatus;
        userId: string;
        sellerId: string | null;
        productId: string | null;
        orderId: string | null;
        type: import(".prisma/client").$Enums.ComplaintType;
        subject: string;
        adminNote: string | null;
        resolvedAt: Date | null;
        resolvedBy: string | null;
    }[]>;
    findAll(page?: number, status?: string): Promise<{
        data: ({
            user: {
                id: string;
                email: string;
                firstName: string;
                lastName: string;
            };
        } & {
            id: string;
            description: string;
            createdAt: Date;
            updatedAt: Date;
            status: import(".prisma/client").$Enums.ComplaintStatus;
            userId: string;
            sellerId: string | null;
            productId: string | null;
            orderId: string | null;
            type: import(".prisma/client").$Enums.ComplaintType;
            subject: string;
            adminNote: string | null;
            resolvedAt: Date | null;
            resolvedBy: string | null;
        })[];
        total: number;
        page: number;
        totalPages: number;
    }>;
    resolve(adminId: string, id: string, status: string, adminNote: string): Promise<{
        id: string;
        description: string;
        createdAt: Date;
        updatedAt: Date;
        status: import(".prisma/client").$Enums.ComplaintStatus;
        userId: string;
        sellerId: string | null;
        productId: string | null;
        orderId: string | null;
        type: import(".prisma/client").$Enums.ComplaintType;
        subject: string;
        adminNote: string | null;
        resolvedAt: Date | null;
        resolvedBy: string | null;
    }>;
}
