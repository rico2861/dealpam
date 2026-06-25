import { PrismaService } from '../../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
export declare class UsersService {
    private prisma;
    private mail;
    constructor(prisma: PrismaService, mail: MailService);
    findAll(page?: number): import(".prisma/client").Prisma.PrismaPromise<{
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
    update(id: string, data: any): import(".prisma/client").Prisma.Prisma__UserClient<{
        id: string;
        email: string;
        phone: string;
        firstName: string;
        lastName: string;
        avatar: string;
        city: string;
        department: string;
    }, never, import("@prisma/client/runtime/library").DefaultArgs>;
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
    adminResetPassword(userId: string): Promise<{
        message: string;
    }>;
}
