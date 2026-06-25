import { UsersService } from './users.service';
export declare class UsersController {
    private us;
    constructor(us: UsersService);
    getMe(u: any): import(".prisma/client").Prisma.Prisma__UserClient<{
        id: string;
        isActive: boolean;
        createdAt: Date;
        email: string;
        phone: string;
        firstName: string;
        lastName: string;
        avatar: string;
        role: import(".prisma/client").$Enums.Role;
        city: string;
        department: string;
    }, null, import("@prisma/client/runtime/library").DefaultArgs>;
    updateMe(u: any, b: any): import(".prisma/client").Prisma.Prisma__UserClient<{
        id: string;
        email: string;
        phone: string;
        firstName: string;
        lastName: string;
        avatar: string;
        city: string;
        department: string;
    }, never, import("@prisma/client/runtime/library").DefaultArgs>;
    findAll(p: number): import(".prisma/client").Prisma.PrismaPromise<{
        id: string;
        isActive: boolean;
        createdAt: Date;
        email: string;
        firstName: string;
        lastName: string;
        role: import(".prisma/client").$Enums.Role;
    }[]>;
    findOne(id: string): import(".prisma/client").Prisma.Prisma__UserClient<{
        id: string;
        isActive: boolean;
        createdAt: Date;
        email: string;
        phone: string;
        firstName: string;
        lastName: string;
        avatar: string;
        role: import(".prisma/client").$Enums.Role;
        city: string;
        department: string;
    }, null, import("@prisma/client/runtime/library").DefaultArgs>;
    disable(id: string): import(".prisma/client").Prisma.Prisma__UserClient<{
        id: string;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        email: string;
        phone: string | null;
        passwordResetToken: string | null;
        passwordHash: string;
        firstName: string;
        lastName: string;
        avatar: string | null;
        role: import(".prisma/client").$Enums.Role;
        isEmailVerified: boolean;
        mustChangePassword: boolean;
        failedLoginAttempts: number;
        lockedUntil: Date | null;
        passwordResetExpires: Date | null;
        city: string | null;
        department: string | null;
    }, never, import("@prisma/client/runtime/library").DefaultArgs>;
    enable(id: string): import(".prisma/client").Prisma.Prisma__UserClient<{
        id: string;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        email: string;
        phone: string | null;
        passwordResetToken: string | null;
        passwordHash: string;
        firstName: string;
        lastName: string;
        avatar: string | null;
        role: import(".prisma/client").$Enums.Role;
        isEmailVerified: boolean;
        mustChangePassword: boolean;
        failedLoginAttempts: number;
        lockedUntil: Date | null;
        passwordResetExpires: Date | null;
        city: string | null;
        department: string | null;
    }, never, import("@prisma/client/runtime/library").DefaultArgs>;
    adminResetPassword(id: string): Promise<{
        message: string;
    }>;
}
