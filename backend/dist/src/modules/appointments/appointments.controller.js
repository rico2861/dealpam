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
exports.AppointmentsController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const jwt_auth_guard_1 = require("../../shared/guards/jwt-auth.guard");
const appointments_service_1 = require("./appointments.service");
let AppointmentsController = class AppointmentsController {
    constructor(svc) {
        this.svc = svc;
    }
    create(req, dto) {
        return this.svc.create(req.user.id, dto);
    }
    myAppointments(req) {
        return this.svc.findForUser(req.user.id);
    }
    sellerAppointments(req) {
        return this.svc.findForSeller(req.user.seller?.id || req.user.id);
    }
    updateStatus(req, id, body) {
        return this.svc.updateStatus(req.user.seller?.id || req.user.id, id, body.status, body.sellerNote);
    }
    cancel(req, id) {
        return this.svc.cancel(req.user.id, id);
    }
};
exports.AppointmentsController = AppointmentsController;
__decorate([
    (0, common_1.Post)(),
    (0, swagger_1.ApiOperation)({ summary: 'Prendre un rendez-vous (véhicule, service…)' }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], AppointmentsController.prototype, "create", null);
__decorate([
    (0, common_1.Get)('mine'),
    (0, swagger_1.ApiOperation)({ summary: 'Mes rendez-vous (client)' }),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], AppointmentsController.prototype, "myAppointments", null);
__decorate([
    (0, common_1.Get)('seller'),
    (0, swagger_1.ApiOperation)({ summary: 'Rendez-vous de ma boutique (vendeur)' }),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], AppointmentsController.prototype, "sellerAppointments", null);
__decorate([
    (0, common_1.Patch)(':id/status'),
    (0, swagger_1.ApiOperation)({ summary: 'Confirmer/refuser un RDV (vendeur)' }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", void 0)
], AppointmentsController.prototype, "updateStatus", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'Annuler un rendez-vous (client)' }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], AppointmentsController.prototype, "cancel", null);
exports.AppointmentsController = AppointmentsController = __decorate([
    (0, swagger_1.ApiTags)('Appointments'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Controller)('appointments'),
    __metadata("design:paramtypes", [appointments_service_1.AppointmentsService])
], AppointmentsController);
//# sourceMappingURL=appointments.controller.js.map