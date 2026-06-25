import { PrismaService } from '../../prisma/prisma.service';
export declare class BrandsService {
    private prisma;
    constructor(prisma: PrismaService);
    findAll(): import(".prisma/client").Prisma.PrismaPromise<{
        id: string;
        name: string;
        isActive: boolean;
        createdAt: Date;
        slug: string;
        logoUrl: string | null;
    }[]>;
    create(data: any): import(".prisma/client").Prisma.Prisma__BrandClient<{
        id: string;
        name: string;
        isActive: boolean;
        createdAt: Date;
        slug: string;
        logoUrl: string | null;
    }, never, import("@prisma/client/runtime/library").DefaultArgs>;
    update(id: string, data: any): import(".prisma/client").Prisma.Prisma__BrandClient<{
        id: string;
        name: string;
        isActive: boolean;
        createdAt: Date;
        slug: string;
        logoUrl: string | null;
    }, never, import("@prisma/client/runtime/library").DefaultArgs>;
    remove(id: string): import(".prisma/client").Prisma.Prisma__BrandClient<{
        id: string;
        name: string;
        isActive: boolean;
        createdAt: Date;
        slug: string;
        logoUrl: string | null;
    }, never, import("@prisma/client/runtime/library").DefaultArgs>;
}
