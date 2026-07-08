import { Module } from '@nestjs/common';
import { APP_GUARD, APP_FILTER } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { AllExceptionsFilter } from './shared/filters/all-exceptions.filter';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaModule } from './prisma/prisma.module';
import { MailModule } from './modules/mail/mail.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { SellersModule } from './modules/sellers/sellers.module';
import { StoresModule } from './modules/stores/stores.module';
import { SubscriptionsModule } from './modules/subscriptions/subscriptions.module';
import { ProductsModule } from './modules/products/products.module';
import { CategoriesModule } from './modules/categories/categories.module';
import { BrandsModule } from './modules/brands/brands.module';
import { CartModule } from './modules/cart/cart.module';
import { OrdersModule } from './modules/orders/orders.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { ReviewsModule } from './modules/reviews/reviews.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { UploadModule } from './modules/upload/upload.module';
import { ChatModule } from './modules/chat/chat.module';
import { AppointmentsModule } from './modules/appointments/appointments.module';
import { ComplaintsModule } from './modules/complaints/complaints.module';
import { AdsModule } from './modules/ads/ads.module';
import { FlashSaleModule } from './modules/flash-sale/flash-sale.module';
import { BadgesModule } from './modules/badges/badges.module';
import { MoncashModule } from './modules/moncash/moncash.module';
import { WishlistModule } from './modules/wishlist/wishlist.module';
import { BannersModule } from './modules/banners/banners.module';
import { EventsModule } from './modules/events/events.module';
import { AlgoModule } from './modules/algo/algo.module';
import { NewsletterModule } from './modules/newsletter/newsletter.module';
import { PlatformStoreModule } from './modules/platform-store/platform-store.module';
import { WalletModule } from './modules/wallet/wallet.module';
import { MoncashTransactionsModule } from './modules/moncash-transactions/moncash-transactions.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 120 }]),
    PrismaModule,
    MailModule,
    AuthModule,
    UsersModule,
    SellersModule,
    StoresModule,
    SubscriptionsModule,
    ProductsModule,
    CategoriesModule,
    BrandsModule,
    CartModule,
    OrdersModule,
    PaymentsModule,
    ReviewsModule,
    NotificationsModule,
    DashboardModule,
    UploadModule,
    ChatModule,
    AppointmentsModule,
    ComplaintsModule,
    AdsModule,
    FlashSaleModule,
    BadgesModule,
    MoncashModule,
    WishlistModule,
    BannersModule,
    EventsModule,
    AlgoModule,
    NewsletterModule,
    PlatformStoreModule,
    WalletModule,
    MoncashTransactionsModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
  ],
})
export class AppModule {}
