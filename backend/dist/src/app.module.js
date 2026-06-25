"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const throttler_1 = require("@nestjs/throttler");
const schedule_1 = require("@nestjs/schedule");
const prisma_module_1 = require("./prisma/prisma.module");
const mail_module_1 = require("./modules/mail/mail.module");
const auth_module_1 = require("./modules/auth/auth.module");
const users_module_1 = require("./modules/users/users.module");
const sellers_module_1 = require("./modules/sellers/sellers.module");
const stores_module_1 = require("./modules/stores/stores.module");
const subscriptions_module_1 = require("./modules/subscriptions/subscriptions.module");
const products_module_1 = require("./modules/products/products.module");
const categories_module_1 = require("./modules/categories/categories.module");
const brands_module_1 = require("./modules/brands/brands.module");
const cart_module_1 = require("./modules/cart/cart.module");
const orders_module_1 = require("./modules/orders/orders.module");
const payments_module_1 = require("./modules/payments/payments.module");
const reviews_module_1 = require("./modules/reviews/reviews.module");
const notifications_module_1 = require("./modules/notifications/notifications.module");
const dashboard_module_1 = require("./modules/dashboard/dashboard.module");
const upload_module_1 = require("./modules/upload/upload.module");
const chat_module_1 = require("./modules/chat/chat.module");
const appointments_module_1 = require("./modules/appointments/appointments.module");
const complaints_module_1 = require("./modules/complaints/complaints.module");
const ads_module_1 = require("./modules/ads/ads.module");
const badges_module_1 = require("./modules/badges/badges.module");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule.forRoot({ isGlobal: true }),
            schedule_1.ScheduleModule.forRoot(),
            throttler_1.ThrottlerModule.forRoot([{ ttl: 60000, limit: 120 }]),
            prisma_module_1.PrismaModule,
            mail_module_1.MailModule,
            auth_module_1.AuthModule,
            users_module_1.UsersModule,
            sellers_module_1.SellersModule,
            stores_module_1.StoresModule,
            subscriptions_module_1.SubscriptionsModule,
            products_module_1.ProductsModule,
            categories_module_1.CategoriesModule,
            brands_module_1.BrandsModule,
            cart_module_1.CartModule,
            orders_module_1.OrdersModule,
            payments_module_1.PaymentsModule,
            reviews_module_1.ReviewsModule,
            notifications_module_1.NotificationsModule,
            dashboard_module_1.DashboardModule,
            upload_module_1.UploadModule,
            chat_module_1.ChatModule,
            appointments_module_1.AppointmentsModule,
            complaints_module_1.ComplaintsModule,
            ads_module_1.AdsModule,
            badges_module_1.BadgesModule,
        ],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map