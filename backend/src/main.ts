import { join } from 'path';
import { existsSync } from 'fs';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import * as compression from 'compression';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger: ['error', 'warn', 'log'],
  });

  // ── Security Headers ──────────────────────────────────────────────────────
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc:  ["'self'", "'unsafe-inline'"],
          styleSrc:   ["'self'", "'unsafe-inline'"],
          imgSrc:     ["'self'", 'data:', 'https:'],
          connectSrc: ["'self'", 'wss:', 'ws:'],
          fontSrc:    ["'self'", 'https:', 'data:'],
          objectSrc:  ["'none'"],
          frameSrc:   ["'none'"],
        },
      },
      crossOriginEmbedderPolicy: false,
    }),
  );

  // ── Compression ───────────────────────────────────────────────────────────
  app.use(compression());

  // ── CORS ──────────────────────────────────────────────────────────────────
  const allowedOrigins = [
    process.env.FRONTEND_URL,
    process.env.ADMIN_URL,
    'http://localhost:5173',
    'http://localhost:5174',
  ].filter(Boolean) as string[];

  app.enableCors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
      callback(new Error(`CORS: origin ${origin} not allowed`));
    },
    methods:        ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    credentials:    true,
    maxAge:         86400,
  });

  // ── Global prefix ─────────────────────────────────────────────────────────
  app.setGlobalPrefix('v1', {
    exclude: ['health'],
  });

  // ── Validation ────────────────────────────────────────────────────────────
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist:            true,
      forbidNonWhitelisted: true,
      transform:            true,
      transformOptions:     { enableImplicitConversion: true },
    }),
  );

  // ── Swagger ───────────────────────────────────────────────────────────────
  const config = new DocumentBuilder()
    .setTitle('Dealpam API')
    .setDescription('API REST — Marketplace Dealpam Haïti')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  SwaggerModule.setup('api/docs', app, SwaggerModule.createDocument(app, config));

  // ── Health check ──────────────────────────────────────────────────────────
  const httpAdapter = app.getHttpAdapter();
  httpAdapter.get('/health', (_req: any, res: any) => {
    res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // ── Servir le frontend React (si le dossier public existe) ───────────────
  const publicDir = join(__dirname, 'public');
  if (existsSync(publicDir)) {
    app.useStaticAssets(publicDir);
    // Toutes les routes non-API renvoient index.html (React Router)
    httpAdapter.get('*', (req: any, res: any) => {
      if (!req.url.startsWith('/v1') && !req.url.startsWith('/health') && !req.url.startsWith('/api')) {
        res.sendFile(join(publicDir, 'index.html'));
      }
    });
    console.log(`🌐 Frontend servi depuis ${publicDir}`);
  } else {
    console.log(`⚠️  Dossier public introuvable — mode API only`);
  }

  const port = process.env.PORT ?? 3000;
  await app.listen(port, '0.0.0.0');
  console.log(`✅ Dealpam API démarré sur le port ${port}`);
}

bootstrap();
