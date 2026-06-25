import { NotificationsService } from './notifications.service';
export declare class NotificationsController {
    private ns;
    constructor(ns: NotificationsService);
    getAll(u: any): import(".prisma/client").Prisma.PrismaPromise<{
        id: string;
        createdAt: Date;
        data: import("@prisma/client/runtime/library").JsonValue | null;
        userId: string;
        title: string;
        body: string;
        type: string;
        isRead: boolean;
    }[]>;
    markRead(id: string): import(".prisma/client").Prisma.Prisma__NotificationClient<{
        id: string;
        createdAt: Date;
        data: import("@prisma/client/runtime/library").JsonValue | null;
        userId: string;
        title: string;
        body: string;
        type: string;
        isRead: boolean;
    }, never, import("@prisma/client/runtime/library").DefaultArgs>;
    markAllRead(u: any): import(".prisma/client").Prisma.PrismaPromise<import(".prisma/client").Prisma.BatchPayload>;
}
