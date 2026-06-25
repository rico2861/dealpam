import { BrandsService } from './brands.service';
export declare class BrandsController {
    private bs;
    constructor(bs: BrandsService);
    findAll(): import(".prisma/client").Prisma.PrismaPromise<{
        id: string;
        name: string;
        isActive: boolean;
        createdAt: Date;
        slug: string;
        logoUrl: string | null;
    }[]>;
    create(b: any): import(".prisma/client").Prisma.Prisma__BrandClient<{
        id: string;
        name: string;
        isActive: boolean;
        createdAt: Date;
        slug: string;
        logoUrl: string | null;
    }, never, import("@prisma/client/runtime/library").DefaultArgs>;
    update(id: string, b: any): import(".prisma/client").Prisma.Prisma__BrandClient<{
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
