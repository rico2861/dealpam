"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ComplaintsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
let ComplaintsService = class ComplaintsService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async create(userId, dto) {
        return this.prisma.complaint.create({
            data: { userId, ...dto },
            include: { user: { select: { id: true, firstName: true, lastName: true, email: true } } },
        });
    }
    async findForUser(userId) {
        return this.prisma.complaint.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
        });
    }
    async findAll(page = 1, status) {
        const where = status ? { status: status } : {};
        const [data, total] = await Promise.all([
            this.prisma.complaint.findMany({
                where,
                include: { user: { select: { id: true, firstName: true, lastName: true, email: true } } },
                orderBy: { createdAt: 'desc' },
                skip: (page - 1) * 20,
                take: 20,
            }),
            this.prisma.complaint.count({ where }),
        ]);
        return { data, total, page, totalPages: Math.ceil(total / 20) };
    }
    async resolve(adminId, id, status, adminNote) {
        const complaint = await this.prisma.complaint.findUnique({ where: { id } });
        if (!complaint)
            throw new common_1.NotFoundException('Plainte introuvable');
        return this.prisma.complaint.update({
            where: { id },
            data: { status: status, adminNote, resolvedBy: adminId, resolvedAt: status !== 'OPEN' ? new Date() : null },
        });
    }
};
exports.ComplaintsService = ComplaintsService;
exports.ComplaintsService = ComplaintsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], ComplaintsService);
//# sourceMappingURL=complaints.service.js.map