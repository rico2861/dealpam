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
exports.UsersService = void 0;
const common_1 = require("@nestjs/common");
const bcrypt = require("bcrypt");
const prisma_service_1 = require("../../prisma/prisma.service");
const mail_service_1 = require("../mail/mail.service");
let UsersService = class UsersService {
    constructor(prisma, mail) {
        this.prisma = prisma;
        this.mail = mail;
    }
    findAll(page = 1) {
        return this.prisma.user.findMany({
            select: { id: true, email: true, firstName: true, lastName: true, role: true, isActive: true, createdAt: true },
            skip: (page - 1) * 20, take: 20, orderBy: { createdAt: 'desc' },
        });
    }
    findOne(id) {
        return this.prisma.user.findUnique({
            where: { id },
            select: { id: true, email: true, firstName: true, lastName: true, role: true, phone: true, avatar: true, isActive: true, city: true, department: true, createdAt: true },
        });
    }
    update(id, data) {
        return this.prisma.user.update({
            where: { id }, data,
            select: { id: true, email: true, firstName: true, lastName: true, phone: true, avatar: true, city: true, department: true },
        });
    }
    disable(id) { return this.prisma.user.update({ where: { id }, data: { isActive: false } }); }
    enable(id) { return this.prisma.user.update({ where: { id }, data: { isActive: true } }); }
    async adminResetPassword(userId) {
        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        if (!user)
            throw new common_1.NotFoundException('Utilisateur introuvable');
        const words = ['Deal', 'Pam', 'Mart', 'Shop', 'Haiti', 'Vente', 'Achat', 'Store'];
        const w = () => words[Math.floor(Math.random() * words.length)];
        const d = () => Math.floor(Math.random() * 9000 + 1000);
        const tempPassword = `${w()}${w()}${d()}`;
        const hash = await bcrypt.hash(tempPassword, 12);
        await this.prisma.user.update({ where: { id: userId }, data: { password: hash, mustChangePassword: true } });
        await this.mail.sendAdminPasswordReset(user.email, user.firstName, tempPassword);
        return { message: `Mot de passe temporaire envoyé à ${user.email}` };
    }
};
exports.UsersService = UsersService;
exports.UsersService = UsersService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService, mail_service_1.MailService])
], UsersService);
//# sourceMappingURL=users.service.js.map