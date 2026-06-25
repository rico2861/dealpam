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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdsController = void 0;
const common_1 = require("@nestjs/common");
const ads_service_1 = require("./ads.service");
const create_campaign_dto_1 = require("./create-campaign.dto");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const roles_guard_1 = require("../auth/guards/roles.guard");
const roles_decorator_1 = require("../auth/decorators/roles.decorator");
const current_user_decorator_1 = require("../auth/decorators/current-user.decorator");
let AdsController = class AdsController {
    constructor(ads) {
        this.ads = ads;
    }
    serve(department, gender, age, limit) {
        return this.ads.getAdsForUser({
            department,
            gender,
            age: age ? parseInt(age) : undefined,
            limit: limit ? parseInt(limit) : 8,
        });
    }
    track(campaignId, type, user, dept) {
        return this.ads.trackEvent(campaignId, type, user?.id, dept);
    }
    async create(user, dto) {
        const seller = await this.getSellerId(user.id);
        return this.ads.createCampaign(seller, dto);
    }
    async getMy(user, page) {
        const seller = await this.getSellerId(user.id);
        return this.ads.getMyCampaigns(seller, page);
    }
    async getStats(user, id) {
        const seller = await this.getSellerId(user.id);
        return this.ads.getCampaignStats(id, seller);
    }
    async pause(user, id) {
        const seller = await this.getSellerId(user.id);
        return this.ads.pauseCampaign(id, seller);
    }
    async resume(user, id) {
        const seller = await this.getSellerId(user.id);
        return this.ads.resumeCampaign(id, seller);
    }
    async cancel(user, id) {
        const seller = await this.getSellerId(user.id);
        return this.ads.cancelCampaign(id, seller);
    }
    getAll(page, status) {
        return this.ads.getAllCampaigns(page, status);
    }
    getAdminStats() {
        return this.ads.getAdminStats();
    }
    review(id, user, body) {
        return this.ads.reviewCampaign(id, user.id, body.action, body.note);
    }
    forceStatus(id, status) {
        return this.ads.adminForceStatus(id, status);
    }
    async getSellerId(userId) {
        const { PrismaService } = await Promise.resolve().then(() => require('../../prisma/prisma.service'));
        const prisma = this.ads.prisma;
        const seller = await prisma.seller.findUnique({ where: { userId } });
        if (!seller)
            throw new Error('Seller not found');
        return seller.id;
    }
};
exports.AdsController = AdsController;
__decorate([
    (0, common_1.Get)('serve'),
    __param(0, (0, common_1.Query)('department')),
    __param(1, (0, common_1.Query)('gender')),
    __param(2, (0, common_1.Query)('age')),
    __param(3, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String]),
    __metadata("design:returntype", void 0)
], AdsController.prototype, "serve", null);
__decorate([
    (0, common_1.Post)('track/:campaignId/:type'),
    __param(0, (0, common_1.Param)('campaignId')),
    __param(1, (0, common_1.Param)('type')),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __param(3, (0, common_1.Query)('dept')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object, String]),
    __metadata("design:returntype", void 0)
], AdsController.prototype, "track", null);
__decorate([
    (0, common_1.Post)(),
    (0, roles_decorator_1.Roles)('SELLER'),
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, create_campaign_dto_1.CreateCampaignDto]),
    __metadata("design:returntype", Promise)
], AdsController.prototype, "create", null);
__decorate([
    (0, common_1.Get)('my'),
    (0, roles_decorator_1.Roles)('SELLER'),
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)('page')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Number]),
    __metadata("design:returntype", Promise)
], AdsController.prototype, "getMy", null);
__decorate([
    (0, common_1.Get)('my/:id/stats'),
    (0, roles_decorator_1.Roles)('SELLER'),
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], AdsController.prototype, "getStats", null);
__decorate([
    (0, common_1.Patch)('my/:id/pause'),
    (0, roles_decorator_1.Roles)('SELLER'),
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], AdsController.prototype, "pause", null);
__decorate([
    (0, common_1.Patch)('my/:id/resume'),
    (0, roles_decorator_1.Roles)('SELLER'),
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], AdsController.prototype, "resume", null);
__decorate([
    (0, common_1.Patch)('my/:id/cancel'),
    (0, roles_decorator_1.Roles)('SELLER'),
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], AdsController.prototype, "cancel", null);
__decorate([
    (0, common_1.Get)('admin/all'),
    (0, roles_decorator_1.Roles)('ADMIN', 'SUPER_ADMIN'),
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    __param(0, (0, common_1.Query)('page')),
    __param(1, (0, common_1.Query)('status')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, String]),
    __metadata("design:returntype", void 0)
], AdsController.prototype, "getAll", null);
__decorate([
    (0, common_1.Get)('admin/stats'),
    (0, roles_decorator_1.Roles)('ADMIN', 'SUPER_ADMIN'),
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], AdsController.prototype, "getAdminStats", null);
__decorate([
    (0, common_1.Patch)('admin/:id/review'),
    (0, roles_decorator_1.Roles)('ADMIN', 'SUPER_ADMIN'),
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", void 0)
], AdsController.prototype, "review", null);
__decorate([
    (0, common_1.Patch)('admin/:id/status'),
    (0, roles_decorator_1.Roles)('ADMIN', 'SUPER_ADMIN'),
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)('status')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], AdsController.prototype, "forceStatus", null);
exports.AdsController = AdsController = __decorate([
    (0, common_1.Controller)('ads'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [ads_service_1.AdsService])
], AdsController);
//# sourceMappingURL=ads.controller.js.map