import { CategoriesService } from './categories.service';
export declare class CategoriesController {
    private cs;
    constructor(cs: CategoriesService);
    findAll(): import(".prisma/client").Prisma.PrismaPromise<({
        children: {
            id: string;
            name: string;
            isActive: boolean;
            createdAt: Date;
            updatedAt: Date;
            slug: string;
            imageUrl: string | null;
            icon: string | null;
            parentId: string | null;
            sortOrder: number;
        }[];
        _count: {
            products: number;
        };
    } & {
        id: string;
        name: string;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        slug: string;
        imageUrl: string | null;
        icon: string | null;
        parentId: string | null;
        sortOrder: number;
    })[]>;
    create(b: any): import(".prisma/client").Prisma.Prisma__CategoryClient<{
        id: string;
        name: string;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        slug: string;
        imageUrl: string | null;
        icon: string | null;
        parentId: string | null;
        sortOrder: number;
    }, never, import("@prisma/client/runtime/library").DefaultArgs>;
    update(id: string, b: any): import(".prisma/client").Prisma.Prisma__CategoryClient<{
        id: string;
        name: string;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        slug: string;
        imageUrl: string | null;
        icon: string | null;
        parentId: string | null;
        sortOrder: number;
    }, never, import("@prisma/client/runtime/library").DefaultArgs>;
    remove(id: string): import(".prisma/client").Prisma.Prisma__CategoryClient<{
        id: string;
        name: string;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        slug: string;
        imageUrl: string | null;
        icon: string | null;
        parentId: string | null;
        sortOrder: number;
    }, never, import("@prisma/client/runtime/library").DefaultArgs>;
}
