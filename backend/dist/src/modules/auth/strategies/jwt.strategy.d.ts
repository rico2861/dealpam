import { Strategy } from 'passport-jwt';
import { PrismaService } from '../../../prisma/prisma.service';
declare const JwtStrategy_base: new (...args: any[]) => Strategy;
export declare class JwtStrategy extends JwtStrategy_base {
    private prisma;
    constructor(prisma: PrismaService);
    validate(payload: any): Promise<{
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
    }>;
}
export {};
