import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const compression = require('compression');
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
          connectSrc: ["'self'", 'wss:', 'ws:', 'https:', 'http:'],
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

  // ── Body size limits (prevent large payload attacks) ─────────────────────
  app.use(require('express').json({ limit: '5mb' }));
  app.use(require('express').urlencoded({ extended: true, limit: '5mb' }));

  // ── CORS ──────────────────────────────────────────────────────────────────
  const allowedOrigins = [
    process.env.FRONTEND_URL,
    process.env.ADMIN_URL,
    'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:5175',
    'http://localhost:5176',
    'http://localhost:4173',
    'http://192.168.48.1:5173',
    'http://192.168.48.1:5174',
    'http://192.168.111.1:5173',
    'http://192.168.111.1:5174',
    'http://172.20.10.2:5173',
    'http://172.20.10.2:5174',
    'http://172.20.64.1:5173',
    'http://172.20.64.1:5174',
  ].filter(Boolean) as string[];

  // Compare sans le préfixe "www." pour qu'un domaine autorisé couvre
  // automatiquement ses deux variantes (https://dealpam.com et https://www.dealpam.com)
  // sans avoir à les lister séparément.
  const stripWww = (o: string) => o.replace(/^(https?:\/\/)www\./, '$1');
  const normalizedAllowed = allowedOrigins.map(stripWww);

  app.enableCors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (normalizedAllowed.includes(stripWww(origin))) return callback(null, true);
      // Autoriser les IPs réseau local en dev (mobile sur WiFi)
      if (process.env.NODE_ENV !== 'production' &&
        /^http:\/\/(192\.168\.|172\.|10\.)/.test(origin)) {
        return callback(null, true);
      }
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
  // "/" (GET et HEAD) est ping par le health-check de Render sur l'URL racine
  // du service — sans handler dédié, chaque ping loggait une 404 "Cannot GET /"
  // / "Cannot HEAD /" en boucle dans les logs de production, noyant les vraies
  // erreurs. Répond 200 sur les deux méthodes, sans exposer d'info sensible.
  const httpAdapter = app.getHttpAdapter();
  httpAdapter.get('/', (_req: any, res: any) => {
    res.status(200).json({ status: 'ok', service: 'Dealpam API' });
  });
  httpAdapter.head('/', (_req: any, res: any) => {
    res.status(200).end();
  });
  httpAdapter.get('/health', (_req: any, res: any) => {
    res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
  });

const port = process.env.PORT ?? 3000;
  await app.listen(port, '0.0.0.0');
  console.log(`✅ Dealpam API démarré sur le port ${port}`);
}

bootstrap();
