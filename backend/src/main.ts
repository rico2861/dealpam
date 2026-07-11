import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ValidationPipe, BadRequestException } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const compression = require('compression');
import { AppModule } from './app.module';

// ── Traduction des messages de validation class-validator (par défaut en anglais,
// destinés aux devs) vers un français compréhensible par un vendeur/client. Couvre
// les formulations les plus fréquentes générées par les décorateurs du projet ;
// tout message non reconnu passe tel quel plutôt que de bloquer la requête.
function translateValidationMessage(msg: string): string {
  const m = msg.match(/^(\w+) (.+)$/);
  if (!m) return msg;
  const [, field, rest] = m;
  const label = field.replace(/([A-Z])/g, ' $1').toLowerCase().trim();
  const rules: [RegExp, (r: string) => string][] = [
    [/^should not be empty$/,        () => `Le champ "${label}" est requis.`],
    [/^must be an email$/,           () => `L'adresse email n'est pas valide.`],
    [/^must be a string$/,           () => `Le champ "${label}" doit être du texte.`],
    [/^must be a number.*$/,         () => `Le champ "${label}" doit être un nombre.`],
    [/^must be a boolean value$/,    () => `Le champ "${label}" est invalide.`],
    [/^must not be less than (\d+)/, (r) => `Le champ "${label}" doit être d'au moins ${r.match(/\d+/)?.[0]}.`],
    [/^must not be greater than (\d+)/, (r) => `Le champ "${label}" doit être d'au plus ${r.match(/\d+/)?.[0]}.`],
    [/^must be a valid ISO 8601 date string$/, () => `La date fournie pour "${label}" n'est pas valide.`],
    [/^must be one of the following values.*$/, () => `La valeur choisie pour "${label}" n'est pas valide.`],
    [/^must be an array$/,           () => `Le champ "${label}" est invalide.`],
    [/^must be a UUID$/,             () => `Identifiant invalide pour "${label}".`],
    [/^must be longer than or equal to (\d+) characters$/, (r) => `Le champ "${label}" doit contenir au moins ${r.match(/\d+/)?.[0]} caractères.`],
    [/^must be shorter than or equal to (\d+) characters$/, (r) => `Le champ "${label}" ne peut pas dépasser ${r.match(/\d+/)?.[0]} caractères.`],
  ];
  for (const [re, fn] of rules) {
    if (re.test(rest)) return fn(rest);
  }
  return msg;
}

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
      // Domaine temporaire Hostinger (avant pointage du domaine final / staging) —
      // change à chaque site créé (ex: darkgrey-elephant-608046.hostingersite.com),
      // donc on autorise le sous-domaine générique plutôt qu'une valeur figée qui
      // casserait le jour où Hostinger régénère un nouvel alias.
      if (/^https:\/\/[a-z0-9-]+\.hostingersite\.com$/.test(origin)) {
        return callback(null, true);
      }
      callback(new Error(`CORS: origin ${origin} not allowed`));
    },
    methods:        ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'x-viewer-id'],
    credentials:    true,
    maxAge:         86400,
  });

  // ── Global prefix ─────────────────────────────────────────────────────────
  app.setGlobalPrefix('v1', {
    exclude: ['health'],
  });

  // ── Validation ────────────────────────────────────────────────────────────
  // `whitelist: true` retire déjà silencieusement toute propriété non déclarée
  // dans le DTO avant validation — c'est la vraie protection contre le mass
  // assignment. `forbidNonWhitelisted: true` faisait EN PLUS échouer toute la
  // requête avec un message brut de class-validator ("property X should not
  // exist"), en anglais, illisible pour un vendeur — pour un simple champ
  // superflu envoyé par le frontend (ex: un champ purement UI jamais censé
  // atteindre le backend). Retiré : les champs superflus sont juste ignorés.
  // `exceptionFactory` traduit les erreurs de validation restantes (champ
  // manquant/invalide) en français au lieu du texte technique par défaut.
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist:        true,
      transform:        true,
      transformOptions: { enableImplicitConversion: true },
      exceptionFactory: (errors) => {
        const messages = errors.flatMap(e => Object.values(e.constraints ?? {}));
        const translated = messages.map(translateValidationMessage);
        return new BadRequestException(
          translated.length ? translated : ['Données invalides — vérifiez les champs et réessayez.'],
        );
      },
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
