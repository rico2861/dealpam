import { ReviewsService } from './reviews.service';
export declare class ReviewsController {
    private rs;
    constructor(rs: ReviewsService);
    findByProduct(id: string): import(".prisma/client").Prisma.PrismaPromise<({
        user: {
            firstName: string;
            lastName: string;
            avatar: string;
        };
    } & {
        id: string;
        createdAt: Date;
        userId: string;
        storeId: string | null;
        rating: number;
        productId: string | null;
        comment: string | null;
        isApproved: boolean;
    })[]>;
    create(u: any, b: any): import(".prisma/client").Prisma.Prisma__ReviewClient<{
        id: string;
        createdAt: Date;
        userId: string;
        storeId: string | null;
        rating: number;
        productId: string | null;
        comment: string | null;
        isApproved: boolean;
    }, never, import("@prisma/client/runtime/library").DefaultArgs>;
    approve(id: string): import(".prisma/client").Prisma.Prisma__ReviewClient<{
        id: string;
        createdAt: Date;
        userId: string;
        storeId: string | null;
        rating: number;
        productId: string | null;
        comment: string | null;
        isApproved: boolean;
    }, never, import("@prisma/client/runtime/library").DefaultArgs>;
    delete(id: string): import(".prisma/client").Prisma.Prisma__ReviewClient<{
        id: string;
        createdAt: Date;
        userId: string;
        storeId: string | null;
        rating: number;
        productId: string | null;
        comment: string | null;
        isApproved: boolean;
    }, never, import("@prisma/client/runtime/library").DefaultArgs>;
    findAll(p: number): import(".prisma/client").Prisma.PrismaPromise<({
        user: {
            firstName: string;
            lastName: string;
        };
        product: {
            name: string;
        };
    } & {
        id: string;
        createdAt: Date;
        userId: string;
        storeId: string | null;
        rating: number;
        productId: string | null;
        comment: string | null;
        isApproved: boolean;
    })[]>;
}
