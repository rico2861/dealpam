import { ComplaintsService } from './complaints.service';
import { ComplaintType } from '@prisma/client';
export declare class ComplaintsController {
    private svc;
    constructor(svc: ComplaintsService);
    create(req: any, dto: {
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
    mine(req: any): Promise<{
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
    findAll(page: number, status?: string): Promise<{
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
    resolve(req: any, id: string, body: {
        status: string;
        adminNote: string;
    }): Promise<{
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
