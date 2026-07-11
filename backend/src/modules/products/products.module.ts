import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ProductsService } from './products.service';
import { ProductsController } from './products.controller';
import { UploadModule } from '../upload/upload.module';
import { EventsModule } from '../events/events.module';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { MailModule } from '../mail/mail.module';

@Module({
  imports: [
    UploadModule, EventsModule, SubscriptionsModule, NotificationsModule, MailModule,
    // Décodage best-effort d'un token optionnel sur GET /products/:slug (pour
    // exclure les vues du vendeur sur sa propre fiche) — pas de guard, la route
    // reste publique même sans token.
    JwtModule.register({ secret: process.env.JWT_SECRET }),
  ],
  providers: [ProductsService],
  controllers: [ProductsController],
})
export class ProductsModule {}
