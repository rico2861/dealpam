/**
 * Seed complet DealPam — 6 vendeurs avec infos complètes, 11 catégories, 70+ produits
 * Usage: npx ts-node -r tsconfig-paths/register prisma/seed.ts
 */
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();
const hash   = (p: string) => bcrypt.hash(p, 10);

function zone(name: string, departments: string[], price: number, minDays: number, maxDays: number) {
  return { id: name.toLowerCase().replace(/[^a-z0-9]+/g, '-'), name, departments, price, minDays, maxDays };
}

function img(url: string, idx = 0) {
  const publicId = `seed_${Date.now()}_${idx}`;
  return { urlFull: url, urlMedium: url, urlThumb: url, publicId, isPrimary: idx === 0, sortOrder: idx };
}

async function ensureSeller(
  email: string, username: string, pwd: string,
  first: string, last: string, city: string, dept: string,
  storeName: string, storeSlug: string, storeCode: string,
  storeCity: string, storeDept: string,
  phone: string, whatsapp: string, avatar: string,
  storeAddress: string,
  storeDescription: string,
  acceptedPaymentMethods: string[],
  moncashPhone: string | null,
  deliveryZonesIn: any[] = [],
) {
  const pw   = await hash(pwd);
  const user = await prisma.user.upsert({
    where: { email },
    update: { city, department: dept, phone },
    create: {
      email, username, passwordHash: pw,
      firstName: first, lastName: last,
      role: 'SELLER', isEmailVerified: true, isActive: true,
      phone, city, department: dept, avatar,
    },
  });

  let seller = await prisma.seller.findUnique({ where: { userId: user.id } });
  if (!seller) {
    seller = await prisma.seller.create({
      data: {
        userId: user.id, status: 'APPROVED',
        businessCity: storeCity, businessDept: storeDept,
        businessAddress: storeAddress,
      },
    });
  } else {
    await prisma.seller.update({
      where: { id: seller.id },
      data: { businessCity: storeCity, businessDept: storeDept, businessAddress: storeAddress },
    });
  }

  const store = await (prisma.store as any).upsert({
    where: { slug: storeSlug },
    update: {
      city: storeCity, department: storeDept, logoUrl: '',
      phone, whatsapp,
      address: storeAddress,
      description: storeDescription,
      acceptedPaymentMethods: JSON.stringify(acceptedPaymentMethods),
      moncashPhone,
      deliveryZones: JSON.stringify(deliveryZonesIn),
    },
    create: {
      sellerId: seller.id, name: storeName, slug: storeSlug, storeCode,
      isPrimary: true, isActive: true, isVerified: true,
      city: storeCity, department: storeDept, logoUrl: '',
      phone, whatsapp,
      address: storeAddress,
      description: storeDescription,
      acceptedPaymentMethods: JSON.stringify(acceptedPaymentMethods),
      moncashPhone,
      deliveryZones: JSON.stringify(deliveryZonesIn),
      avgRating: +(Math.random() * 1.5 + 3.5).toFixed(1),
    },
  });

  return { user, seller, store };
}

interface ProductOpts {
  totalSold?: number;
  viewCount?: number;
  isFeatured?: boolean;
  isSponsored?: boolean;
}

async function ensureProduct(
  storeId: string, categoryId: string,
  name: string, slug: string,
  price: number, salePrice: number | null,
  stock: number, imageUrls: string[], description: string,
  city: string, department: string,
  opts: ProductOpts = {},
) {
  const existing = await prisma.product.findUnique({ where: { slug } });
  const extra = {
    city, department,
    totalSold:   opts.totalSold  ?? 0,
    viewCount:   opts.viewCount  ?? Math.floor(Math.random() * 800) + 20,
    isFeatured:  opts.isFeatured ?? Math.random() > 0.75,
    isSponsored: opts.isSponsored ?? false,
  };

  if (existing) {
    await (prisma.product as any).update({ where: { id: existing.id }, data: extra });
    return existing;
  }

  const p = await (prisma.product as any).create({
    data: {
      storeId, categoryId, name, slug, description,
      price, salePrice, stock, status: 'PUBLISHED',
      avgRating:    +(Math.random() * 1.5 + 3.5).toFixed(1),
      totalReviews: Math.floor(Math.random() * 120) + 5,
      ...extra,
    },
  });

  await Promise.all(
    imageUrls.map((url, i) =>
      (prisma.productImage as any).create({ data: { productId: p.id, ...img(url, i) } })
    )
  );

  return p;
}

async function main() {
  console.log('Seeding DealPam...');

  // ── Categories ─────────────────────────────────────────────────────────────
  const [catPhone, catVehicle, catMeuble, catVetement, catElec, catMaison,
         catBeaute, catChaussure, catSport, catAlim, catService] =
    await Promise.all([
      prisma.category.upsert({ where:{slug:'smartphones'}, update:{}, create:{ name:'Smartphones',  slug:'smartphones',  sortOrder:1 } }),
      prisma.category.upsert({ where:{slug:'vehicules'},   update:{}, create:{ name:'Vehicules',    slug:'vehicules',   sortOrder:2 } }),
      prisma.category.upsert({ where:{slug:'meubles'},     update:{}, create:{ name:'Meubles',      slug:'meubles',     sortOrder:3 } }),
      prisma.category.upsert({ where:{slug:'vetements'},   update:{}, create:{ name:'Vetements',    slug:'vetements',   sortOrder:4 } }),
      prisma.category.upsert({ where:{slug:'electronique'},update:{}, create:{ name:'Electronique', slug:'electronique',sortOrder:5 } }),
      prisma.category.upsert({ where:{slug:'maison'},      update:{}, create:{ name:'Maison',       slug:'maison',      sortOrder:6 } }),
      prisma.category.upsert({ where:{slug:'beaute'},      update:{}, create:{ name:'Beaute',       slug:'beaute',      sortOrder:7 } }),
      prisma.category.upsert({ where:{slug:'chaussures'},  update:{}, create:{ name:'Chaussures',   slug:'chaussures',  sortOrder:8 } }),
      prisma.category.upsert({ where:{slug:'sport'},       update:{}, create:{ name:'Sport',        slug:'sport',       sortOrder:9 } }),
      prisma.category.upsert({ where:{slug:'alimentation'},update:{}, create:{ name:'Alimentation', slug:'alimentation',sortOrder:10 } }),
      prisma.category.upsert({ where:{slug:'services'},    update:{}, create:{ name:'Services',     slug:'services',    sortOrder:11 } }),
    ]);
  console.log('OK Categories');

  // ── Admin ──────────────────────────────────────────────────────────────────
  await prisma.user.upsert({
    where: { email: 'admin@dealpam.com' },
    update: {},
    create: {
      email: 'admin@dealpam.com', username: 'admin_dealpam',
      passwordHash: await hash('Admin@2025'),
      firstName: 'Admin', lastName: 'DealPam',
      role: 'ADMIN', isEmailVerified: true, isActive: true,
    },
  });

  // ── Client test ─────────────────────────────────────────────────────────────
  await prisma.user.upsert({
    where: { email: 'client@dealpam.com' },
    update: {},
    create: {
      email: 'client@dealpam.com', username: 'jean_client',
      passwordHash: await hash('Client@2025'),
      firstName: 'Jean', lastName: 'Pierre',
      role: 'CUSTOMER', isEmailVerified: true, isActive: true,
      city: 'Port-au-Prince', department: 'Ouest',
    },
  });

  // ── 6 Sellers avec infos complètes ────────────────────────────────────────
  // S1 — Rico Tech Store — Port-au-Prince / Ouest
  const { store: s1 } = await ensureSeller(
    'rico.tech@dealpam.com', 'rico_tech', 'Seller@2025',
    'Rico', 'Brezault', 'Port-au-Prince', 'Ouest',
    'Rico Tech Store', 'rico-tech-store', 'SHOP-0001',
    'Port-au-Prince', 'Ouest',
    '+50937120001', '+50937120001',
    'https://randomuser.me/api/portraits/men/32.jpg',
    '15 Rue Pavée, Pétion-Ville, Port-au-Prince, Ouest',
    'Boutique spécialisée en smartphones, tablettes, accessoires et réparation. Produits garantis, service après-vente disponible.',
    ['MONCASH', 'NATCASH', 'CASH', 'CARD'],
    '+50937120001',
    [
      zone('Port-au-Prince',  ['Ouest'],            500, 1, 2),
      zone('Pétion-Ville',    ['Ouest'],             0, 1, 2),
      zone('Jacmel',          ['Sud-Est'],          800, 2, 4),
      zone('Miragoâne',       ['Nippes'],           900, 2, 4),
    ],
  );

  // S2 — Mode Chic Haiti — Cap-Haïtien / Nord
  const { store: s2 } = await ensureSeller(
    'mode.chic@dealpam.com', 'mode_chic', 'Seller@2025',
    'Marie', 'Chantal', 'Cap-Haitien', 'Nord',
    'Mode Chic Haiti', 'mode-chic-haiti', 'SHOP-0002',
    'Cap-Haitien', 'Nord',
    '+50937120002', '+50937120002',
    'https://randomuser.me/api/portraits/women/44.jpg',
    '8 Avenue Christophe, Cap-Haïtien, Nord',
    'Boutique de mode féminine et masculine. Robes, costumes, vêtements locaux et internationaux. Couture sur mesure disponible.',
    ['MONCASH', 'CASH', 'NATCASH'],
    '+50937120002',
    [
      zone('Cap-Haïtien',  ['Nord'],        0,   1, 2),
      zone('Fort-Liberté', ['Nord-Est'],    600, 2, 3),
      zone('Port-de-Paix', ['Nord-Ouest'],  700, 2, 4),
      zone('Gonaïves',     ['Artibonite'],  650, 2, 3),
    ],
  );

  // S3 — Auto Plus Haiti — Pétion-Ville / Ouest
  const { store: s3 } = await ensureSeller(
    'auto.plus@dealpam.com', 'auto_plus', 'Seller@2025',
    'Pierre', 'Dupont', 'Petionville', 'Ouest',
    'Auto Plus Haiti', 'auto-plus-haiti', 'SHOP-0003',
    'Petionville', 'Ouest',
    '+50937120003', '+50937120003',
    'https://randomuser.me/api/portraits/men/55.jpg',
    '42 Route de Delmas, Pétion-Ville, Ouest',
    'Concessionnaire et vente de véhicules d\'occasion. Voitures, SUV, pickups et motos. Financement disponible. Dossiers complets.',
    ['VIREMENT', 'CASH', 'CARD'],
    null,
    [
      zone('Pétion-Ville',   ['Ouest'], 0,    1, 1),
      zone('Port-au-Prince', ['Ouest'], 1000, 1, 2),
    ],
  );

  // S4 — Marché Gonaïves — Gonaïves / Artibonite
  const { store: s4 } = await ensureSeller(
    'gonaives.market@dealpam.com', 'gonaives_market', 'Seller@2025',
    'Josette', 'François', 'Gonaives', 'Artibonite',
    'Marche Gonaives', 'marche-gonaives', 'SHOP-0004',
    'Gonaives', 'Artibonite',
    '+50937120004', '+50937120004',
    'https://randomuser.me/api/portraits/women/68.jpg',
    '5 Rue du Commerce, Gonaïves, Artibonite',
    'Grand marché polyvalent : alimentaire, électronique, vêtements, chaussures et produits du quotidien. Livraison dans tout l\'Artibonite.',
    ['MONCASH', 'CASH'],
    '+50937120004',
    [
      zone('Gonaïves',       ['Artibonite'], 0,   1, 1),
      zone('Cap-Haïtien',    ['Nord'],       500, 2, 3),
      zone('Port-au-Prince', ['Ouest'],      700, 2, 3),
      zone('Hinche',         ['Centre'],     600, 2, 3),
    ],
  );

  // S5 — Les Cayes Shop — Les Cayes / Sud
  const { store: s5 } = await ensureSeller(
    'cayes.shop@dealpam.com', 'cayes_shop', 'Seller@2025',
    'Jean-Baptiste', 'Louis', 'Les Cayes', 'Sud',
    'Les Cayes Shop', 'les-cayes-shop', 'SHOP-0005',
    'Les Cayes', 'Sud',
    '+50937120005', '+50937120005',
    'https://randomuser.me/api/portraits/men/77.jpg',
    '3 Rue Geffrard, Les Cayes, Sud',
    'Mobilier, électroménager, sport et alimentation. Vendeur de confiance depuis 2019. Livraison dans tout le département du Sud.',
    ['MONCASH', 'NATCASH', 'CASH'],
    '+50937120005',
    [
      zone('Les Cayes',  ['Sud'],         0,   1, 1),
      zone('Jacmel',     ['Sud-Est'],     500, 2, 3),
      zone('Jérémie',    ["Grand'Anse"],  600, 2, 3),
      zone('Miragoâne',  ['Nippes'],      450, 1, 2),
    ],
  );

  // S6 — Jacmel Boutique — Jacmel / Sud-Est
  const { store: s6 } = await ensureSeller(
    'jacmel.boutique@dealpam.com', 'jacmel_boutique', 'Seller@2025',
    'Nadine', 'Beaumont', 'Jacmel', 'Sud-Est',
    'Jacmel Boutique', 'jacmel-boutique', 'SHOP-0006',
    'Jacmel', 'Sud-Est',
    '+50937120006', '+50937120006',
    'https://randomuser.me/api/portraits/women/90.jpg',
    '12 Rue du Commerce, Jacmel, Sud-Est',
    'Boutique multi-produits : beauté, mode, mobilier et arts. Spécialité artisanat haïtien. Expédition nationale.',
    ['MONCASH', 'CASH', 'VIREMENT'],
    '+50937120006',
    [
      zone('Jacmel',          ['Sud-Est'], 0,   1, 1),
      zone('Les Cayes',       ['Sud'],     500, 2, 3),
      zone('Port-au-Prince',  ['Ouest'],   600, 2, 3),
    ],
  );

  console.log('OK Sellers');

  // ── Plans & abonnements ────────────────────────────────────────────────────
  const tierData = [
    { tier: 'ELITE',    name: 'Elite',    price: 5000,  maxP: null, hasVerified: true,  hasElite: true,  hasPriority: true,  hasHomepage: true,  hasStats: true,  hasAuto: true  },
    { tier: 'BUSINESS', name: 'Business', price: 2500,  maxP: 200,  hasVerified: true,  hasElite: false, hasPriority: true,  hasHomepage: false, hasStats: true,  hasAuto: false },
    { tier: 'STARTER',  name: 'Starter',  price: 1000,  maxP: 50,   hasVerified: false, hasElite: false, hasPriority: false, hasHomepage: false, hasStats: false, hasAuto: false },
    { tier: 'FREE',     name: 'Gratuit',  price: 0,     maxP: 5,    hasVerified: false, hasElite: false, hasPriority: false, hasHomepage: false, hasStats: false, hasAuto: false },
  ];
  const plans: Record<string, any> = {};
  for (const t of tierData) {
    plans[t.tier] = await prisma.subscriptionPlan.upsert({
      where: { tier: t.tier },
      update: {},
      create: {
        tier: t.tier, name: t.name, priceHTG: t.price,
        maxProducts: t.maxP, maxImages: t.tier === 'ELITE' ? 20 : t.tier === 'BUSINESS' ? 10 : 5,
        hasVerifiedBadge: t.hasVerified, hasEliteBadge: t.hasElite,
        hasPrioritySearch: t.hasPriority, hasHomepageAd: t.hasHomepage,
        hasAdvancedStats: t.hasStats, hasAutoSponsored: t.hasAuto,
      },
    });
  }
  const sellerTiers: [any, string][] = [
    [s1, 'ELITE'], [s2, 'BUSINESS'], [s3, 'ELITE'],
    [s4, 'STARTER'], [s5, 'BUSINESS'], [s6, 'STARTER'],
  ];
  const endDate = new Date(Date.now() + 365 * 24 * 3600 * 1000);
  for (const [store, tier] of sellerTiers) {
    const seller = await prisma.seller.findFirst({ where: { stores: { some: { id: store.id } } } });
    if (!seller) continue;
    const existing = await prisma.sellerSubscription.findFirst({ where: { sellerId: seller.id, isActive: true } });
    if (!existing) {
      await prisma.sellerSubscription.create({
        data: { sellerId: seller.id, planId: plans[tier].id, isActive: true, startDate: new Date(), endDate },
      });
    }
  }
  console.log('OK Subscriptions');

  // ════════════════════════════════════════════════════════════════════════════
  // PRODUITS — chaque produit a city + department du vendeur
  // ════════════════════════════════════════════════════════════════════════════

  // ── SMARTPHONES ─────────────────────── S1 Port-au-Prince / S3 Pétionville / S4 Gonaïves
  await ensureProduct(s1.id, catPhone.id, 'iPhone 15 Pro Max 256GB', 'iphone-15-pro-max-256gb',
    85000, 79000, 8,
    ['https://images.unsplash.com/photo-1678685888221-cda773a3dcdb?w=700&q=90',
     'https://images.unsplash.com/photo-1510557880182-3d4d3cba35a5?w=700&q=90'],
    'iPhone 15 Pro Max 256GB titane naturel, puce A17 Pro, caméra 48MP ProRAW, 5G. Facture incluse.',
    'Port-au-Prince', 'Ouest');

  await ensureProduct(s1.id, catPhone.id, 'Samsung Galaxy S24 Ultra 512GB', 'samsung-galaxy-s24-ultra-512gb',
    72000, 65000, 12,
    ['https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?w=700&q=90',
     'https://images.unsplash.com/photo-1598327105666-5b89351aff97?w=700&q=90'],
    'Samsung Galaxy S24 Ultra 512GB noir, S-Pen intégré, zoom 100x Space, 12GB RAM.',
    'Port-au-Prince', 'Ouest');

  await ensureProduct(s1.id, catPhone.id, 'Samsung Galaxy A54 128GB', 'samsung-galaxy-a54-128gb',
    28000, 24500, 25,
    ['https://images.unsplash.com/photo-1610945264803-c22b62d2a7b3?w=700&q=90'],
    'Samsung Galaxy A54 128GB, écran 6.4 AMOLED, batterie 5000mAh, Android 14.',
    'Port-au-Prince', 'Ouest');

  await ensureProduct(s3.id, catPhone.id, 'iPhone 14 128GB Noir Minuit', 'iphone-14-128gb-noir',
    60000, 54000, 6,
    ['https://images.unsplash.com/photo-1664478546384-d57ffe74a78c?w=700&q=90'],
    'iPhone 14 128GB noir minuit, Face ID, écran 6.1 Super Retina XDR, 5G. Débloqué tout opérateur.',
    'Petionville', 'Ouest');

  await ensureProduct(s4.id, catPhone.id, 'Tecno Spark 20 Pro 256GB', 'tecno-spark-20-pro-256gb',
    18500, 15900, 30,
    ['https://images.unsplash.com/photo-1585060544812-6b45742d762f?w=700&q=90'],
    'Tecno Spark 20 Pro 256GB, double SIM, charge rapide 33W, batterie 5000mAh.',
    'Gonaives', 'Artibonite');

  await ensureProduct(s4.id, catPhone.id, 'Infinix Hot 40 Pro 128GB', 'infinix-hot-40-pro-128gb',
    12000, 10500, 40,
    ['https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=700&q=90'],
    'Infinix Hot 40 Pro 128GB, écran 6.78 FHD+, batterie 5000mAh.',
    'Gonaives', 'Artibonite');

  await ensureProduct(s4.id, catPhone.id, 'Xiaomi Redmi Note 13 Pro 256GB', 'xiaomi-redmi-note-13-pro-256gb',
    24000, 21000, 20,
    ['https://images.unsplash.com/photo-1601784551446-20c9e07cdbdb?w=700&q=90'],
    'Xiaomi Redmi Note 13 Pro 256GB, caméra 200MP, écran AMOLED 120Hz.',
    'Gonaives', 'Artibonite');

  await ensureProduct(s1.id, catPhone.id, 'iPhone 13 128GB Lumière Stellaire', 'iphone-13-128gb-lumiere',
    42000, 38500, 14,
    ['https://images.unsplash.com/photo-1632661674596-df8be070a5c5?w=700&q=90'],
    'iPhone 13 128GB lumière stellaire, écran 6.1 OLED, double caméra 12MP. Garantie 6 mois.',
    'Port-au-Prince', 'Ouest');

  await ensureProduct(s4.id, catPhone.id, 'Itel A70 64GB Double SIM', 'itel-a70-64gb',
    6500, 5800, 60,
    ['https://images.unsplash.com/photo-1574944985070-8f3ebc6b79d2?w=700&q=90'],
    'Itel A70 64GB, double SIM, batterie 5000mAh, Android 13 Go.',
    'Gonaives', 'Artibonite');

  await ensureProduct(s3.id, catPhone.id, 'Samsung Galaxy Tab S9 FE WiFi 128GB', 'samsung-tab-s9-fe-128gb',
    32000, 28000, 8,
    ['https://images.unsplash.com/photo-1561154464-82e9adf32764?w=700&q=90'],
    'Tablette Samsung Galaxy Tab S9 FE, écran 10.9 TFT, S-Pen inclus, 128GB.',
    'Petionville', 'Ouest');

  // ── VETEMENTS ─────────────────────── S2 Cap-Haïtien / S4 Gonaïves / S6 Jacmel
  await ensureProduct(s2.id, catVetement.id, 'Robe Soirée Longue Rouge', 'robe-soiree-longue-rouge',
    8500, 6800, 15,
    ['https://images.unsplash.com/photo-1566479179817-c0e38fd5c97e?w=700&q=90',
     'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=700&q=90'],
    'Robe de soirée longue rouge, tissu satin, taille S/M/L/XL. Livraison gratuite Cap-Haïtien.',
    'Cap-Haitien', 'Nord');

  await ensureProduct(s2.id, catVetement.id, 'Costume Homme Bleu Marine 3 Pièces', 'costume-homme-bleu-marine-3p',
    18500, 15000, 10,
    ['https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?w=700&q=90'],
    'Costume 3 pièces bleu marine, veste + pantalon + gilet, taille 44 à 56.',
    'Cap-Haitien', 'Nord');

  await ensureProduct(s6.id, catVetement.id, 'Tailleur Femme Blanc Élégant', 'tailleur-femme-blanc-elegant',
    7200, 6000, 12,
    ['https://images.unsplash.com/photo-1583744946564-b52ac1c389c8?w=700&q=90'],
    'Tailleur pantalon femme blanc, veste + pantalon, taille 36 à 44.',
    'Jacmel', 'Sud-Est');

  await ensureProduct(s4.id, catVetement.id, 'T-Shirt Coton Premium Homme', 't-shirt-coton-premium',
    1800, 1400, 60,
    ['https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=700&q=90'],
    'T-shirt col rond 100% coton, 8 couleurs disponibles, S au XXL.',
    'Gonaives', 'Artibonite');

  await ensureProduct(s2.id, catVetement.id, 'Jean Slim Fit Bleu Foncé', 'jean-slim-fit-bleu-fonce',
    3500, 2900, 35,
    ['https://images.unsplash.com/photo-1542272604-787c3835535d?w=700&q=90'],
    'Jean slim fit bleu foncé, stretch confortable, taille 28 à 40.',
    'Cap-Haitien', 'Nord');

  await ensureProduct(s6.id, catVetement.id, 'Chemise Homme Lin Blanc', 'chemise-homme-lin-blanc',
    2800, null, 25,
    ['https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?w=700&q=90'],
    'Chemise homme lin blanc, col classique, légère et respirante, S à XXL.',
    'Jacmel', 'Sud-Est');

  await ensureProduct(s2.id, catVetement.id, 'Robe Midi Fleurie Été Femme', 'robe-midi-fleurie-ete',
    4200, 3400, 22,
    ['https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=700&q=90'],
    'Robe midi fleurie, tissu léger coton, encolure V, taille élastique, S-XL.',
    'Cap-Haitien', 'Nord');

  await ensureProduct(s6.id, catVetement.id, 'Veste Cuir Homme Noir', 'veste-cuir-homme-noir',
    14500, 12000, 8,
    ['https://images.unsplash.com/photo-1551028719-00167b16eac5?w=700&q=90'],
    'Veste en cuir véritable noir, coupe droite, zip central, poches latérales.',
    'Jacmel', 'Sud-Est');

  await ensureProduct(s2.id, catVetement.id, 'Robe de Mariée Princesse Ivoire', 'robe-mariee-princesse-ivoire',
    45000, 38000, 3,
    ['https://images.unsplash.com/photo-1519741497674-611481863552?w=700&q=90'],
    'Robe de mariée princesse ivoire, dentelle et tulle, taille corset sur mesure.',
    'Cap-Haitien', 'Nord');

  // ── VEHICULES ─────────────────────── S3 Pétionville / S5 Les Cayes
  await ensureProduct(s3.id, catVehicle.id, 'Toyota Corolla 2020 Automatique', 'toyota-corolla-2020-auto',
    1800000, 1650000, 2,
    ['https://images.unsplash.com/photo-1621007947382-bb3c3994e3fb?w=700&q=90',
     'https://images.unsplash.com/photo-1568844293986-ca047e3d0e7e?w=700&q=90'],
    'Toyota Corolla 2020, automatique, 50000km, climatisation, parfait état. Dossier complet. Test drive possible.',
    'Petionville', 'Ouest');

  await ensureProduct(s3.id, catVehicle.id, 'Honda CR-V 2019 4x4', 'honda-crv-2019-4x4',
    2200000, 1980000, 1,
    ['https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=700&q=90'],
    'Honda CR-V 2019 4x4, essence, 68000km, toit ouvrant, caméra recul.',
    'Petionville', 'Ouest');

  await ensureProduct(s5.id, catVehicle.id, 'Moto Yamaha YBR 125cc Noire', 'moto-yamaha-ybr-125cc',
    185000, 165000, 4,
    ['https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=700&q=90'],
    'Yamaha YBR 125cc noire, économique, peu consommatrice, parfaite pour la ville.',
    'Les Cayes', 'Sud');

  await ensureProduct(s3.id, catVehicle.id, 'Hyundai Tucson 2021 Full Options', 'hyundai-tucson-2021-full',
    2800000, 2500000, 1,
    ['https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=700&q=90'],
    'Hyundai Tucson 2021, diesel, 35000km, toit panoramique, CarPlay. Garantie 6 mois.',
    'Petionville', 'Ouest');

  await ensureProduct(s3.id, catVehicle.id, 'Pickup Toyota Hilux 2018', 'toyota-hilux-2018',
    3200000, 2900000, 1,
    ['https://images.unsplash.com/photo-1533591380348-14193f1de18f?w=700&q=90'],
    'Toyota Hilux 2018 double cabine, diesel 4x4, 80000km, benne aluminium.',
    'Petionville', 'Ouest');

  await ensureProduct(s3.id, catVehicle.id, 'Kia Sportage 2022 AWD Diesel', 'kia-sportage-2022-awd',
    3500000, 3200000, 1,
    ['https://images.unsplash.com/photo-1494976388531-d1058494cdd8?w=700&q=90'],
    'Kia Sportage 2022 AWD diesel, 18000km, garantie constructeur, full options.',
    'Petionville', 'Ouest');

  await ensureProduct(s5.id, catVehicle.id, 'Tricycle Cargo Électrique 500kg', 'tricycle-cargo-electrique',
    185000, 165000, 3,
    ['https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=700&q=90'],
    'Tricycle cargo électrique 500kg, batterie 72V/60Ah, autonomie 80km, idéal livraison.',
    'Les Cayes', 'Sud');

  // ── ELECTRONIQUE ─────────────────────── S1 Port-au-Prince / S3 Pétionville / S4 Gonaïves
  await ensureProduct(s1.id, catElec.id, 'MacBook Air M2 13 pouces 256GB', 'macbook-air-m2-256gb',
    125000, 115000, 5,
    ['https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=700&q=90'],
    'MacBook Air M2 13 pouces, 8GB RAM, 256GB SSD, gris sidéral, 18h autonomie. Garanti 1 an.',
    'Port-au-Prince', 'Ouest');

  await ensureProduct(s1.id, catElec.id, 'Écran Samsung 27 pouces 4K 144Hz', 'ecran-samsung-27-4k-144hz',
    22000, 19500, 10,
    ['https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=700&q=90'],
    'Écran Samsung 27 pouces, 4K UHD, 144Hz, IPS, HDMI + DisplayPort + USB-C.',
    'Port-au-Prince', 'Ouest');

  await ensureProduct(s3.id, catElec.id, 'TV Samsung 55 pouces QLED 4K Smart', 'tv-samsung-55-qled-4k',
    45000, 38000, 6,
    ['https://images.unsplash.com/photo-1593359677879-a4bb92f4834c?w=700&q=90'],
    'Samsung TV 55 pouces QLED 4K Smart TV, Netflix YouTube intégrés, HDR10+.',
    'Petionville', 'Ouest');

  await ensureProduct(s4.id, catElec.id, 'Clavier Mécanique Gaming RGB', 'clavier-mecanique-gaming-rgb',
    8500, 7200, 20,
    ['https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=700&q=90'],
    'Clavier mécanique gaming RGB, switches bleus, USB, rétroéclairage custom.',
    'Gonaives', 'Artibonite');

  await ensureProduct(s1.id, catElec.id, 'iPad Air 5 64GB WiFi', 'ipad-air-5-64gb-wifi',
    55000, 49000, 7,
    ['https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=700&q=90'],
    'iPad Air 5e génération, puce M1, écran 10.9 Liquid Retina, USB-C.',
    'Port-au-Prince', 'Ouest');

  await ensureProduct(s4.id, catElec.id, 'Casque Sony WH-1000XM5 Noir', 'casque-sony-wh-1000xm5',
    28000, 24000, 12,
    ['https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=700&q=90'],
    'Casque sans fil Sony WH-1000XM5, ANC industrie, 30h autonomie, Bluetooth 5.2.',
    'Gonaives', 'Artibonite');

  await ensureProduct(s1.id, catElec.id, 'AirPods Pro 2e génération', 'airpods-pro-2eme-gen',
    22000, 19500, 15,
    ['https://images.unsplash.com/photo-1600294037681-c80b4cb5b434?w=700&q=90'],
    'AirPods Pro 2e gen, ANC adaptatif, Transparency, boîtier MagSafe USB-C.',
    'Port-au-Prince', 'Ouest');

  await ensureProduct(s4.id, catElec.id, 'Manette PS5 DualSense Blanche', 'manette-ps5-dualsense',
    9500, 8200, 18,
    ['https://images.unsplash.com/photo-1607016284318-d1384bf1cadd?w=700&q=90'],
    'Manette Sony DualSense PS5 blanche, retour haptique, gâchettes adaptatives.',
    'Gonaives', 'Artibonite');

  await ensureProduct(s3.id, catElec.id, 'Console PlayStation 5 Slim 1TB', 'ps5-slim-1tb',
    95000, 89000, 3,
    ['https://images.unsplash.com/photo-1606144042614-b2417e99c4e3?w=700&q=90'],
    'PlayStation 5 Slim 1TB, lecteur Blu-ray inclus, 4K 120fps, SSD ultra-rapide.',
    'Petionville', 'Ouest');

  await ensureProduct(s1.id, catElec.id, 'Imprimante Canon PIXMA G3470 WiFi', 'imprimante-canon-pixma-g3470',
    18500, 15900, 10,
    ['https://images.unsplash.com/photo-1612815154858-60aa4c59eaa6?w=700&q=90'],
    'Canon PIXMA G3470, réservoir recharge, WiFi, impression photo A4, multifonction.',
    'Port-au-Prince', 'Ouest');

  // ── MEUBLES ─────────────────────── S5 Les Cayes / S6 Jacmel
  await ensureProduct(s5.id, catMeuble.id, 'Canapé 3 Places Velours Gris', 'canape-3-places-velours-gris',
    28000, 24000, 5,
    ['https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=700&q=90',
     'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=700&q=90'],
    'Canapé 3 places velours gris anthracite, pieds métal doré, très confortable. Livraison Les Cayes.',
    'Les Cayes', 'Sud');

  await ensureProduct(s5.id, catMeuble.id, 'Lit Double 160x200 Bois Massif', 'lit-double-160x200-bois',
    35000, null, 4,
    ['https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=700&q=90'],
    'Lit double 160x200 structure bois massif naturel, avec sommier à lattes inclus.',
    'Les Cayes', 'Sud');

  await ensureProduct(s5.id, catMeuble.id, 'Table Manger 6 Personnes Acacia', 'table-manger-6p-acacia',
    42000, 36000, 3,
    ['https://images.unsplash.com/photo-1533090481720-856c6e3c1fdc?w=700&q=90'],
    'Table rectangulaire 6 personnes, bois d\'acacia massif, 180x90cm.',
    'Les Cayes', 'Sud');

  await ensureProduct(s6.id, catMeuble.id, 'Bureau Informatique Blanc 120cm', 'bureau-informatique-blanc',
    12000, 9800, 8,
    ['https://images.unsplash.com/photo-1518455027359-f3f8164ba6bd?w=700&q=90'],
    'Bureau informatique blanc 120cm, plateau verre trempé, support moniteur inclus.',
    'Jacmel', 'Sud-Est');

  await ensureProduct(s6.id, catMeuble.id, 'Armoire 3 Portes Miroir Blanc', 'armoire-3-portes-miroir-blanc',
    28000, 24500, 4,
    ['https://images.unsplash.com/photo-1558997519-83ea9252edf8?w=700&q=90'],
    'Armoire 3 portes dont 1 miroir, blanc laqué, 180cm haut, 2 tringles + étagères.',
    'Jacmel', 'Sud-Est');

  await ensureProduct(s5.id, catMeuble.id, 'Chaise Bureau Ergonomique Noire', 'chaise-bureau-ergonomique',
    9800, 8200, 12,
    ['https://images.unsplash.com/photo-1592078615290-033ee584e267?w=700&q=90'],
    'Chaise de bureau ergonomique, accoudoirs réglables, appui lombaire, roulettes.',
    'Les Cayes', 'Sud');

  // ── BEAUTE ─────────────────────── S6 Jacmel / S2 Cap-Haïtien / S4 Gonaïves
  await ensureProduct(s6.id, catBeaute.id, 'Parfum Femme Chloé Rose 75ml', 'parfum-chloe-rose-75ml',
    12000, 9500, 20,
    ['https://images.unsplash.com/photo-1541643600914-78b084683702?w=700&q=90'],
    'Eau de parfum Chloé Rose 75ml, fragrance florale romantique, longue tenue.',
    'Jacmel', 'Sud-Est');

  await ensureProduct(s6.id, catBeaute.id, 'Crème Visage SPF 50 Hydratante', 'creme-visage-spf50',
    4500, 3800, 35,
    ['https://images.unsplash.com/photo-1556228578-8c89e6adf883?w=700&q=90'],
    'Crème hydratante SPF 50 quotidienne, protection UVA/UVB, peaux mixtes.',
    'Jacmel', 'Sud-Est');

  await ensureProduct(s2.id, catBeaute.id, 'Set Maquillage Pro 12 Pièces', 'set-maquillage-pro-12p',
    6800, 5500, 15,
    ['https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=700&q=90'],
    'Set maquillage complet 12 pièces, fond de teint, mascara, rouge à lèvres, palette.',
    'Cap-Haitien', 'Nord');

  await ensureProduct(s4.id, catBeaute.id, 'Shampooing Kératine Lissant 500ml', 'shampoing-keratine-500ml',
    2200, 1800, 50,
    ['https://images.unsplash.com/photo-1527799820374-dcf8d9d4a388?w=700&q=90'],
    'Shampooing à la kératine 500ml, lisse et nourrit, tous types de cheveux.',
    'Gonaives', 'Artibonite');

  await ensureProduct(s2.id, catBeaute.id, 'Lisseur Ghd Platinum+ Noir', 'lisseur-ghd-platinum-noir',
    22000, 18500, 8,
    ['https://images.unsplash.com/photo-1522338242992-e1a54906a8da?w=700&q=90'],
    'Lisseur ghd Platinum+ noir, température intelligente 185°C, protection cheveux.',
    'Cap-Haitien', 'Nord');

  await ensureProduct(s6.id, catBeaute.id, 'Huile Argan Bio 100ml Maroc', 'huile-argan-bio-100ml',
    1800, 1500, 80,
    ['https://images.unsplash.com/photo-1608248597279-f99d160bfcbc?w=700&q=90'],
    'Huile d\'argan pure bio 100ml, certifiée 100% naturelle, cheveux et peau.',
    'Jacmel', 'Sud-Est');

  // ── MAISON ─────────────────────── S5 Les Cayes / S4 Gonaïves / S6 Jacmel
  await ensureProduct(s5.id, catMaison.id, 'Ventilateur Plafond 52 pouces avec Télécommande', 'ventilateur-plafond-52p',
    9500, 7800, 12,
    ['https://images.unsplash.com/photo-1513694203232-719a280e022f?w=700&q=90'],
    'Ventilateur plafond 52 pouces, 3 vitesses, réversible, silencieux, télécommande.',
    'Les Cayes', 'Sud');

  await ensureProduct(s5.id, catMaison.id, 'Réfrigérateur LG 350L NoFrost', 'refrigerateur-lg-350l',
    48000, 42000, 4,
    ['https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=700&q=90'],
    'Réfrigérateur LG 350 litres NoFrost, double porte, classe A++, distributeur eau.',
    'Les Cayes', 'Sud');

  await ensureProduct(s6.id, catMaison.id, 'Climatiseur Inverter 12000 BTU', 'climatiseur-inverter-12000btu',
    38000, 34000, 6,
    ['https://images.unsplash.com/photo-1585771724684-38269d6639fd?w=700&q=90'],
    'Climatiseur split 12000 BTU inverter, Wi-Fi, classe énergétique A, silencieux.',
    'Jacmel', 'Sud-Est');

  await ensureProduct(s4.id, catMaison.id, 'Machine à Laver 7kg Frontal', 'machine-laver-7kg-frontal',
    32000, 28000, 5,
    ['https://images.unsplash.com/photo-1626806787461-102c1bfaaea1?w=700&q=90'],
    'Machine à laver 7kg chargement frontal, 15 programmes, classe A+++, silencieuse.',
    'Gonaives', 'Artibonite');

  await ensureProduct(s5.id, catMaison.id, 'Micro-Ondes Samsung 28L Inox', 'micro-ondes-samsung-28l',
    12000, 10500, 10,
    ['https://images.unsplash.com/photo-1585771724684-38269d6639fd?w=700&q=90'],
    'Micro-ondes Samsung 28L inox, 900W, grill intégré, 10 programmes auto.',
    'Les Cayes', 'Sud');

  await ensureProduct(s6.id, catMaison.id, 'Chauffe-eau Solaire 200L', 'chauffe-eau-solaire-200l',
    85000, 75000, 2,
    ['https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=700&q=90'],
    'Chauffe-eau solaire 200L, capteur vitré, ballon inox, garantie 5 ans.',
    'Jacmel', 'Sud-Est');

  await ensureProduct(s4.id, catMaison.id, 'Mixeur Blender 1500W 2L', 'mixeur-blender-1500w-2l',
    6800, 5500, 25,
    ['https://images.unsplash.com/photo-1570222094114-d054a817e56b?w=700&q=90'],
    'Blender professionnel 1500W, bol 2L inox, 10 vitesses, broyer glace.',
    'Gonaives', 'Artibonite');

  // ── CHAUSSURES ─────────────────────── S2 Cap-Haïtien / S4 Gonaïves / S5 Les Cayes
  await ensureProduct(s2.id, catChaussure.id, 'Basket Nike Air Max 270 Blanc', 'basket-nike-air-max-270-blanc',
    12000, 9500, 25,
    ['https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?w=700&q=90'],
    'Nike Air Max 270 blanc/noir, coussin Air 270, T38 à T46, homme et femme.',
    'Cap-Haitien', 'Nord');

  await ensureProduct(s2.id, catChaussure.id, 'Escarpins Femme Rouge Talon 8cm', 'escarpins-femme-rouge-8cm',
    5500, 4200, 18,
    ['https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=700&q=90'],
    'Escarpins talon aiguille 8cm rouge, bout pointu, simili cuir, T35 à T41.',
    'Cap-Haitien', 'Nord');

  await ensureProduct(s4.id, catChaussure.id, 'Sandales Cuir Homme Marron', 'sandales-cuir-homme-marron',
    2200, null, 40,
    ['https://images.unsplash.com/photo-1603487742131-4160ec999306?w=700&q=90'],
    'Sandales cuir véritable marron, semelle anatomique confort, T39 à T46.',
    'Gonaives', 'Artibonite');

  await ensureProduct(s5.id, catChaussure.id, 'Basket Adidas Stan Smith Blanc', 'basket-adidas-stan-smith',
    9500, 8000, 20,
    ['https://images.unsplash.com/photo-1491553895911-0055eca6402d?w=700&q=90'],
    'Adidas Stan Smith blanc/vert, cuir lisse, semelle caoutchouc, T36 à T46.',
    'Les Cayes', 'Sud');

  await ensureProduct(s4.id, catChaussure.id, 'Basket Nike Air Force 1 Blanc', 'basket-nike-air-force-1-blanc',
    11500, 9800, 30,
    ['https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=700&q=90'],
    'Nike Air Force 1 blanc classique, cuir lisse, semelle Air, T38-T46.',
    'Gonaives', 'Artibonite');

  await ensureProduct(s5.id, catChaussure.id, 'Mocassins Cuir Femme Nude', 'mocassins-cuir-femme-nude',
    4800, 3900, 20,
    ['https://images.unsplash.com/photo-1535043934128-cf0b28d52f95?w=700&q=90'],
    'Mocassins femme cuir nude, confort quotidien, bit métal doré, T35-T41.',
    'Les Cayes', 'Sud');

  // ── SPORT ─────────────────────── S4 Gonaïves / S5 Les Cayes / S6 Jacmel
  await ensureProduct(s5.id, catSport.id, 'Vélo VTT 26 pouces 21 vitesses', 'velo-vtt-26-21v',
    28000, 24000, 5,
    ['https://images.unsplash.com/photo-1485965120184-e220f721d03e?w=700&q=90'],
    'VTT 26 pouces cadre aluminium, 21 vitesses Shimano, freins disque mécaniques.',
    'Les Cayes', 'Sud');

  await ensureProduct(s4.id, catSport.id, 'Haltères Réglables 20kg Fonte Paire', 'halteres-20kg-fonte',
    8500, null, 10,
    ['https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=700&q=90'],
    'Paire d\'haltères réglables 2 à 20kg, disques fonte, barre chrome de 35cm.',
    'Gonaives', 'Artibonite');

  await ensureProduct(s6.id, catSport.id, 'Maillot PSG Domicile 2024/25', 'maillot-psg-domicile-2024',
    4500, 3500, 30,
    ['https://images.unsplash.com/photo-1522778119026-d647f0596c20?w=700&q=90'],
    'Maillot officiel PSG domicile saison 2024/25, tissu Dri-FIT, T S à XXL.',
    'Jacmel', 'Sud-Est');

  await ensureProduct(s5.id, catSport.id, 'Tapis Yoga Antidérapant 6mm', 'tapis-yoga-antiderapant-6mm',
    3500, 2800, 25,
    ['https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=700&q=90'],
    'Tapis yoga 6mm, surface antidérapante, lavable, inclus sac transport.',
    'Les Cayes', 'Sud');

  await ensureProduct(s5.id, catSport.id, 'Piscine Gonflable Familiale 4x2m', 'piscine-gonflable-4x2m',
    18500, 15000, 4,
    ['https://images.unsplash.com/photo-1530549387789-4c1017266635?w=700&q=90'],
    'Piscine gonflable familiale 4x2m, pompe + bâche incluses, diam. 120cm.',
    'Les Cayes', 'Sud');

  await ensureProduct(s4.id, catSport.id, 'Gants Boxe Cuir 12oz Noirs', 'gants-boxe-cuir-12oz',
    5500, 4500, 15,
    ['https://images.unsplash.com/photo-1549719386-74dfcbf7dbed?w=700&q=90'],
    'Gants de boxe 12oz cuir véritable, rembourrage triple, velcro ajustable.',
    'Gonaives', 'Artibonite');

  // ── ALIMENTATION ─────────────────────── S4 Gonaïves / S5 Les Cayes
  await ensureProduct(s4.id, catAlim.id, 'Café Haïti Blue Mountain 500g', 'cafe-haiti-blue-mountain-500g',
    1800, null, 100,
    ['https://images.unsplash.com/photo-1447933601403-0c6688de566e?w=700&q=90'],
    'Café en grains Blue Mountain Haïti 500g, arabica, torréfaction artisanale locale.',
    'Gonaives', 'Artibonite');

  await ensureProduct(s5.id, catAlim.id, 'Rhum Barbancourt Réserve 15 ans 700ml', 'rhum-barbancourt-15ans',
    3500, 3000, 50,
    ['https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=700&q=90'],
    'Rhum Barbancourt Réserve Spéciale 15 ans, 43% vol, médaille or Paris 2023.',
    'Les Cayes', 'Sud');

  await ensureProduct(s4.id, catAlim.id, 'Huile Végétale Pure 5 Litres', 'huile-vegetale-pure-5l',
    1200, 1050, 200,
    ['https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=700&q=90'],
    'Huile végétale pure 5 litres, friture et assaisonnement, sans cholestérol.',
    'Gonaives', 'Artibonite');

  await ensureProduct(s5.id, catAlim.id, 'Clairin Vaval Rum Blanc 700ml', 'clairin-vaval-rum-blanc',
    1200, null, 150,
    ['https://images.unsplash.com/photo-1551538827-9c037cb4f32a?w=700&q=90'],
    'Clairin Vaval rum artisanal haïtien 700ml, 47% vol, notes canne à sucre.',
    'Les Cayes', 'Sud');

  await ensureProduct(s4.id, catAlim.id, 'Cacao Haïtien Bio 250g Poudre', 'cacao-haitien-bio-250g',
    850, 700, 200,
    ['https://images.unsplash.com/photo-1481391319762-47dff72954d9?w=700&q=90'],
    'Cacao en poudre bio 100% haïtien 250g, riche en flavonoïdes, non sucré.',
    'Gonaives', 'Artibonite');

  // ── SERVICES ─────────────────────── S1 Port-au-Prince / S6 Jacmel
  await ensureProduct(s1.id, catService.id, 'Réparation iPhone Écran Cassé', 'reparation-iphone-ecran',
    4500, 3800, 999,
    ['https://images.unsplash.com/photo-1621905251189-08b1058d8b1d?w=700&q=90'],
    'Remplacement écran iPhone toutes générations, garantie 3 mois, pièces originales. Délai 2h.',
    'Port-au-Prince', 'Ouest');

  await ensureProduct(s6.id, catService.id, 'Cours Couture Débutant 10h', 'cours-couture-debutant-10h',
    3500, null, 20,
    ['https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=700&q=90'],
    'Formation couture débutant 10h, tous niveaux, matériel fourni, certificat de fin de formation.',
    'Jacmel', 'Sud-Est');

  console.log('OK Products (base)');

  // ════════════════════════════════════════════════════════════════════════
  // NOUVEAUX VENDEURS — 4 zones supplémentaires
  // ════════════════════════════════════════════════════════════════════════

  // S7 — TechNord Limonade — Limonade / Nord
  const { store: s7 } = await ensureSeller(
    'technord@dealpam.com', 'technord_limonade', 'Seller@2025',
    'Frantz', 'Alexis', 'Limonade', 'Nord',
    'TechNord Limonade', 'technord-limonade', 'SHOP-0007',
    'Limonade', 'Nord',
    '+50937120007', '+50937120007',
    'https://randomuser.me/api/portraits/men/11.jpg',
    '3 Rue Principale, Limonade, Nord',
    'Électronique, smartphones et accessoires pour le nord d\'Haïti. Livraison Cap-Haïtien et environs.',
    ['MONCASH', 'CASH'],
    '+50937120007',
    [
      zone('Limonade',     ['Nord'],       0,   1, 1),
      zone('Cap-Haïtien',  ['Nord'],       300, 1, 2),
      zone('Fort-Liberté', ['Nord-Est'],   600, 2, 3),
      zone('Port-de-Paix', ['Nord-Ouest'], 700, 2, 3),
    ],
  );

  // S8 — Marché Saint-Marc — Saint-Marc / Artibonite
  const { store: s8 } = await ensureSeller(
    'saintmarc.market@dealpam.com', 'saintmarc_market', 'Seller@2025',
    'Claudette', 'Joseph', 'Saint-Marc', 'Artibonite',
    'Marché Saint-Marc', 'marche-saint-marc', 'SHOP-0008',
    'Saint-Marc', 'Artibonite',
    '+50937120008', '+50937120008',
    'https://randomuser.me/api/portraits/women/22.jpg',
    '12 Avenue du Commerce, Saint-Marc, Artibonite',
    'Alimentation, vêtements, produits locaux et importés. Grand marché de Saint-Marc.',
    ['MONCASH', 'NATCASH', 'CASH'],
    '+50937120008',
    [
      zone('Saint-Marc',     ['Artibonite'], 0,   1, 1),
      zone('Hinche',         ['Centre'],     500, 2, 3),
      zone('Port-au-Prince', ['Ouest'],      600, 2, 3),
    ],
  );

  // S9 — Grand'Anse Style — Jérémie / Grand'Anse
  const { store: s9 } = await ensureSeller(
    'grandanse.style@dealpam.com', 'grandanse_style', 'Seller@2025',
    'Roseline', 'Désir', 'Jeremie', 'Grand-Anse',
    "Grand'Anse Style", 'grandanse-style', 'SHOP-0009',
    'Jeremie', 'Grand-Anse',
    '+50937120009', '+50937120009',
    'https://randomuser.me/api/portraits/women/33.jpg',
    '5 Rue du Bord-de-Mer, Jérémie, Grand-Anse',
    'Mode locale, artisanat, beauté et produits du terroir de la Grand\'Anse. Expédition partout.',
    ['MONCASH', 'CASH'],
    '+50937120009',
    [
      zone('Jérémie',   ['Grand-Anse'], 0,   1, 1),
      zone('Miragoâne', ['Nippes'],     500, 2, 3),
      zone('Les Cayes', ['Sud'],        500, 2, 3),
    ],
  );

  // S10 — Nord-Est Plus — Fort-Liberté / Nord-Est
  const { store: s10 } = await ensureSeller(
    'nordest.plus@dealpam.com', 'nordest_plus', 'Seller@2025',
    'Samuel', 'Paul', 'Fort-Liberte', 'Nord-Est',
    'Nord-Est Plus', 'nordest-plus', 'SHOP-0010',
    'Fort-Liberte', 'Nord-Est',
    '+50937120010', '+50937120010',
    'https://randomuser.me/api/portraits/men/44.jpg',
    '7 Rue Centrale, Fort-Liberté, Nord-Est',
    'Électronique, alimentation, mobilier pour le Nord-Est. Vendeur sérieux depuis 2020.',
    ['MONCASH', 'CASH'],
    '+50937120010',
    [
      zone('Fort-Liberté', ['Nord-Est'],   0,   1, 1),
      zone('Cap-Haïtien',  ['Nord'],       400, 1, 2),
      zone('Port-de-Paix', ['Nord-Ouest'], 500, 2, 3),
    ],
  );

  // Abonnements nouveaux vendeurs
  const sellerTiers2: [any, string][] = [
    [s7, 'BUSINESS'], [s8, 'BUSINESS'], [s9, 'STARTER'], [s10, 'STARTER'],
  ];
  for (const [store, tier] of sellerTiers2) {
    const seller2 = await prisma.seller.findFirst({ where: { stores: { some: { id: store.id } } } });
    if (!seller2) continue;
    const existing2 = await prisma.sellerSubscription.findFirst({ where: { sellerId: seller2.id, isActive: true } });
    if (!existing2) {
      await prisma.sellerSubscription.create({
        data: { sellerId: seller2.id, planId: plans['BUSINESS'].id, isActive: true, startDate: new Date(), endDate: new Date(Date.now() + 365 * 24 * 3600 * 1000) },
      });
    }
  }
  console.log('OK New sellers (S7-S10)');

  // ── S11 — Sud Market Les Cayes (2ème boutique dans la même ville) ──────────
  const { store: s11 } = await ensureSeller(
    'sudmarket.cayes@dealpam.com', 'sudmarket_cayes', 'Seller@2025',
    'Jean-Pierre', 'Auguste', 'Les Cayes', 'Sud',
    'Sud Market Les Cayes', 'sud-market-cayes', 'SHOP-0011',
    'Les Cayes', 'Sud',
    '+50937120011', '+50937120011',
    'https://randomuser.me/api/portraits/men/55.jpg',
    '22 Rue du Commerce, Les Cayes, Sud',
    'Alimentation, électronique et mode pour le Sud. Livraison rapide Les Cayes et Cayes-Jacmel.',
    ['MONCASH', 'NATCASH', 'CASH'],
    '+50937120011',
    [
      zone('Les Cayes',  ['Sud'],        0,   1, 1),
      zone('Miragoâne',  ['Nippes'],     400, 1, 2),
      zone('Jérémie',    ['Grand-Anse'], 500, 2, 3),
    ],
  );

  // Abonnement S11
  const seller11 = await prisma.seller.findFirst({ where: { stores: { some: { id: s11.id } } } });
  if (seller11) {
    const existing11 = await prisma.sellerSubscription.findFirst({ where: { sellerId: seller11.id, isActive: true } });
    if (!existing11) {
      await prisma.sellerSubscription.create({
        data: { sellerId: seller11.id, planId: plans['BUSINESS'].id, isActive: true, startDate: new Date(), endDate: new Date(Date.now() + 365 * 24 * 3600 * 1000) },
      });
    }
  }

  // ── S12 — Pétion Shop (2ème boutique Pétion-Ville) ─────────────────────────
  const { store: s12 } = await ensureSeller(
    'petionshop@dealpam.com', 'petion_shop', 'Seller@2025',
    'Marie', 'Belizaire', 'Petionville', 'Ouest',
    'Pétion Shop', 'petion-shop', 'SHOP-0012',
    'Petionville', 'Ouest',
    '+50937120012', '+50937120012',
    'https://randomuser.me/api/portraits/women/66.jpg',
    '14 Route de Frères, Pétion-Ville, Ouest',
    'Cosmétiques, vêtements tendance et accessoires. Livraison Ouest et Sud-Est.',
    ['MONCASH', 'CASH'],
    '+50937120012',
    [
      zone('Pétion-Ville',   ['Ouest'],   0,   1, 1),
      zone('Port-au-Prince', ['Ouest'],   300, 1, 2),
      zone('Jacmel',         ['Sud-Est'], 500, 2, 3),
    ],
  );

  const seller12 = await prisma.seller.findFirst({ where: { stores: { some: { id: s12.id } } } });
  if (seller12) {
    const existing12 = await prisma.sellerSubscription.findFirst({ where: { sellerId: seller12.id, isActive: true } });
    if (!existing12) {
      await prisma.sellerSubscription.create({
        data: { sellerId: seller12.id, planId: plans['STARTER'].id, isActive: true, startDate: new Date(), endDate: new Date(Date.now() + 365 * 24 * 3600 * 1000) },
      });
    }
  }

  // ── S13 — Cap Nord Tech (2ème boutique Cap-Haïtien) ───────────────────────
  const { store: s13 } = await ensureSeller(
    'capnord.tech@dealpam.com', 'capnord_tech', 'Seller@2025',
    'Réginald', 'Toussaint', 'Cap-Haitien', 'Nord',
    'Cap Nord Tech', 'cap-nord-tech', 'SHOP-0013',
    'Cap-Haitien', 'Nord',
    '+50937120013', '+50937120013',
    'https://randomuser.me/api/portraits/men/77.jpg',
    '9 Boulevard du Cap, Cap-Haïtien, Nord',
    'Électronique, informatique, téléphonie. Réparation et vente. Cap-Haïtien.',
    ['MONCASH', 'CASH'],
    '+50937120013',
    [
      zone('Cap-Haïtien',  ['Nord'],       0,   1, 1),
      zone('Fort-Liberté', ['Nord-Est'],   400, 1, 2),
      zone('Port-de-Paix', ['Nord-Ouest'], 500, 2, 3),
    ],
  );

  const seller13 = await prisma.seller.findFirst({ where: { stores: { some: { id: s13.id } } } });
  if (seller13) {
    const existing13 = await prisma.sellerSubscription.findFirst({ where: { sellerId: seller13.id, isActive: true } });
    if (!existing13) {
      await prisma.sellerSubscription.create({
        data: { sellerId: seller13.id, planId: plans['BUSINESS'].id, isActive: true, startDate: new Date(), endDate: new Date(Date.now() + 365 * 24 * 3600 * 1000) },
      });
    }
  }

  // ── S14 — PAP Mode (2ème boutique Port-au-Prince) ─────────────────────────
  const { store: s14 } = await ensureSeller(
    'papmode@dealpam.com', 'pap_mode', 'Seller@2025',
    'Nadège', 'Pierre-Louis', 'Port-au-Prince', 'Ouest',
    'PAP Mode', 'pap-mode', 'SHOP-0014',
    'Port-au-Prince', 'Ouest',
    '+50937120014', '+50937120014',
    'https://randomuser.me/api/portraits/women/88.jpg',
    '45 Avenue Martin Luther King, Port-au-Prince, Ouest',
    'Mode femme, accessoires, bijoux fantaisie. Centre de Port-au-Prince.',
    ['MONCASH', 'NATCASH', 'CASH'],
    '+50937120014',
    [
      zone('Port-au-Prince', ['Ouest'],      0,   1, 1),
      zone('Jacmel',         ['Sud-Est'],    500, 2, 3),
      zone('Gonaïves',       ['Artibonite'], 500, 2, 3),
    ],
  );

  const seller14 = await prisma.seller.findFirst({ where: { stores: { some: { id: s14.id } } } });
  if (seller14) {
    const existing14 = await prisma.sellerSubscription.findFirst({ where: { sellerId: seller14.id, isActive: true } });
    if (!existing14) {
      await prisma.sellerSubscription.create({
        data: { sellerId: seller14.id, planId: plans['BUSINESS'].id, isActive: true, startDate: new Date(), endDate: new Date(Date.now() + 365 * 24 * 3600 * 1000) },
      });
    }
  }

  console.log('OK Extra sellers (S11-S14)');

  // ════════════════════════════════════════════════════════════════════════
  // FLASH VENTES — salePrice 25-40% sous le prix normal, haute visibilité
  // ════════════════════════════════════════════════════════════════════════

  // Limonade / Nord
  const pFlash1 = await ensureProduct(s7.id, catPhone.id,
    'Samsung Galaxy A35 5G 128GB — FLASH', 'samsung-a35-5g-flash',
    22000, 15400, 20,
    ['https://images.unsplash.com/photo-1610945264803-c22b62d2a7b3?w=700&q=90'],
    'FLASH -30% | Samsung Galaxy A35 5G 128GB, écran AMOLED 6.6", batterie 5000mAh, Android 14.',
    'Limonade', 'Nord',
    { totalSold: 42, viewCount: 3800, isFeatured: true, isSponsored: true });

  const pFlash2 = await ensureProduct(s7.id, catElec.id,
    'JBL Charge 5 Enceinte Bluetooth — FLASH', 'jbl-charge5-flash',
    9500, 6650, 15,
    ['https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=700&q=90'],
    'FLASH -30% | JBL Charge 5, 20h autonomie, waterproof IP67, charge USB-C.',
    'Limonade', 'Nord',
    { totalSold: 31, viewCount: 2900, isFeatured: true });

  const pFlash3 = await ensureProduct(s1.id, catElec.id,
    'Apple Watch SE 2 40mm GPS — FLASH', 'apple-watch-se2-flash',
    28000, 19600, 10,
    ['https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=700&q=90'],
    'FLASH -30% | Apple Watch SE 2e gen, GPS, écran Retina, détection chutes. Stock limité.',
    'Port-au-Prince', 'Ouest',
    { totalSold: 28, viewCount: 4200, isFeatured: true, isSponsored: true });

  const pFlash4 = await ensureProduct(s2.id, catVetement.id,
    'Robe Ete Imprimee Multicolore — FLASH', 'robe-ete-imprimee-flash',
    4500, 2700, 30,
    ['https://images.unsplash.com/photo-1585487000160-6ebcfceb0d03?w=700&q=90'],
    'FLASH -40% | Robe d\'été légère, imprimé tropical, tailles S à XL. Parfaite pour la saison.',
    'Cap-Haitien', 'Nord',
    { totalSold: 55, viewCount: 2100, isFeatured: true });

  const pFlash5 = await ensureProduct(s8.id, catAlim.id,
    'Pack Riz Blanc Premium 25kg — FLASH', 'riz-blanc-premium-25kg-flash',
    3800, 2660, 50,
    ['https://images.unsplash.com/photo-1536304993881-ff86e6e7e5d0?w=700&q=90'],
    'FLASH -30% | Riz blanc premium grain long 25kg, Saint-Marc. Livraison Artibonite incluse.',
    'Saint-Marc', 'Artibonite',
    { totalSold: 78, viewCount: 1800, isFeatured: false });

  const pFlash6 = await ensureProduct(s3.id, catElec.id,
    'DJI Mini 4 Pro Drone 4K — FLASH', 'dji-mini4-pro-flash',
    85000, 63750, 5,
    ['https://images.unsplash.com/photo-1473968512647-3e447244af8f?w=700&q=90'],
    'FLASH -25% | DJI Mini 4 Pro, vidéo 4K/60fps, obstacle avoidance, 34min vol. Occasion.',
    'Petionville', 'Ouest',
    { totalSold: 8, viewCount: 5200, isFeatured: true, isSponsored: true });

  const pFlash7 = await ensureProduct(s5.id, catMeuble.id,
    'Chaise Ergonomique Bureau — FLASH', 'chaise-ergonomique-flash',
    18000, 12600, 12,
    ['https://images.unsplash.com/photo-1598300042247-d088f8ab3a91?w=700&q=90'],
    'FLASH -30% | Chaise de bureau ergonomique, accoudoirs réglables, lombaire, rembourrage mémoire.',
    'Les Cayes', 'Sud',
    { totalSold: 19, viewCount: 1600, isFeatured: true });

  const pFlash8 = await ensureProduct(s6.id, catBeaute.id,
    'Coffret Soins Visage Femme — FLASH', 'coffret-soins-visage-flash',
    8500, 5100, 25,
    ['https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=700&q=90'],
    'FLASH -40% | Coffret soins visage 5 pièces : sérum, crème, masque, contour yeux, tonique.',
    'Jacmel', 'Sud-Est',
    { totalSold: 44, viewCount: 3300, isFeatured: true });

  console.log('OK Flash products');

  // ════════════════════════════════════════════════════════════════════════
  // PRODUITS S11 — Sud Market Les Cayes
  // ════════════════════════════════════════════════════════════════════════
  await ensureProduct(s11.id, catAlim.id,
    'Huile Végétale Palme Rouge 4L', 'huile-palme-rouge-4l',
    1200, null, 150,
    ['https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=700&q=90'],
    'Huile de palme rouge pure 4L, produit local Sud Haïti. Idéale cuisine traditionnelle.',
    'Les Cayes', 'Sud',
    { totalSold: 134, viewCount: 880 });

  await ensureProduct(s11.id, catVetement.id,
    'Chemise Homme Coton Slim Fit', 'chemise-homme-coton-slim',
    2800, 2380, 45,
    ['https://images.unsplash.com/photo-1602810319428-019690571b5b?w=700&q=90'],
    'Chemise homme coton slim fit, disponible blanc/bleu/noir, tailles S à XXL.',
    'Les Cayes', 'Sud',
    { totalSold: 67, viewCount: 1200 });

  await ensureProduct(s11.id, catElec.id,
    'Téléviseur Smart TV 43 pouces 4K', 'smart-tv-43-4k-les-cayes',
    28000, 23800, 8,
    ['https://images.unsplash.com/photo-1593359677879-a4bb92f4834e?w=700&q=90'],
    'Smart TV 43 pouces 4K UHD, WiFi intégré, Netflix/YouTube. Les Cayes, livraison Sud.',
    'Les Cayes', 'Sud',
    { totalSold: 21, viewCount: 2400, isFeatured: true });

  await ensureProduct(s11.id, catMaison.id,
    'Réfrigérateur 2 Portes 300L', 'refrigerateur-2-portes-300l',
    38000, 32300, 5,
    ['https://images.unsplash.com/photo-1571175443880-49e1d25b2bc5?w=700&q=90'],
    'Réfrigérateur 2 portes 300L, No Frost, éclairage LED. Livraison gratuite Les Cayes.',
    'Les Cayes', 'Sud',
    { totalSold: 14, viewCount: 1900, isFeatured: true });

  await ensureProduct(s11.id, catBeaute.id,
    'Shampoing Keratine Professionnel 500ml', 'shampoing-keratine-500ml',
    1800, 1530, 60,
    ['https://images.unsplash.com/photo-1585747860715-2ba37e788b70?w=700&q=90'],
    'Shampoing kératine professionnel 500ml, lissant et nourrissant, tous types cheveux.',
    'Les Cayes', 'Sud',
    { totalSold: 89, viewCount: 1100 });

  await ensureProduct(s11.id, catChaussure.id,
    'Sandales Homme Cuir Marron', 'sandales-homme-cuir-marron',
    3200, null, 30,
    ['https://images.unsplash.com/photo-1603808033192-082d6919d3e1?w=700&q=90'],
    'Sandales homme cuir véritable marron, semelle caoutchouc, tailles 40-46.',
    'Les Cayes', 'Sud',
    { totalSold: 53, viewCount: 760 });

  // ════════════════════════════════════════════════════════════════════════
  // PRODUITS S12 — Pétion Shop (Pétion-Ville)
  // ════════════════════════════════════════════════════════════════════════
  await ensureProduct(s12.id, catBeaute.id,
    'Fond de Teint MAC Studio Fix 30ml', 'fond-teint-mac-studio-fix',
    4500, 3825, 25,
    ['https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=700&q=90'],
    'Fond de teint MAC Studio Fix Fluid SPF 15, 30ml, couverture complète, 35 teintes.',
    'Petionville', 'Ouest',
    { totalSold: 72, viewCount: 2800 });

  await ensureProduct(s12.id, catVetement.id,
    'Robe Soirée Cocktail Noire', 'robe-soiree-cocktail-noire',
    8500, 7225, 15,
    ['https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=700&q=90'],
    'Robe cocktail noire, coupe ajustée, tissu crêpe, décolleté V. Tailles XS-XL.',
    'Petionville', 'Ouest',
    { totalSold: 38, viewCount: 3200, isFeatured: true });

  await ensureProduct(s12.id, catBeaute.id,
    'Rouge à Lèvres Charlotte Tilbury Lot 3', 'rouge-a-levres-charlotte-tilbury-lot3',
    6500, 5200, 20,
    ['https://images.unsplash.com/photo-1586495777744-4e6232bf2153?w=700&q=90'],
    'Lot 3 rouges à lèvres Charlotte Tilbury Matte Revolution, teintes best-sellers.',
    'Petionville', 'Ouest',
    { totalSold: 45, viewCount: 2100 });

  await ensureProduct(s12.id, catVetement.id,
    'Sac Coach Tabby 26 Cuir Fauve', 'sac-coach-tabby-26-fauve',
    32000, 27200, 6,
    ['https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=700&q=90'],
    'Sac Coach Tabby 26 cuir fauve, bandoulière réglable, intérieur tissu. Authentique.',
    'Petionville', 'Ouest',
    { totalSold: 11, viewCount: 4800, isFeatured: true });

  // ════════════════════════════════════════════════════════════════════════
  // PRODUITS S13 — Cap Nord Tech (Cap-Haïtien)
  // ════════════════════════════════════════════════════════════════════════
  await ensureProduct(s13.id, catPhone.id,
    'Samsung Galaxy A54 256GB Violet', 'samsung-galaxy-a54-256gb-violet',
    24000, 20400, 18,
    ['https://images.unsplash.com/photo-1610945264803-c22b62d2a7b3?w=700&q=90'],
    'Samsung Galaxy A54 256GB violet, écran Super AMOLED 6.4", batterie 5000mAh. Cap-Haïtien.',
    'Cap-Haitien', 'Nord',
    { totalSold: 29, viewCount: 3600, isFeatured: true });

  await ensureProduct(s13.id, catElec.id,
    'Imprimante HP LaserJet Pro M404n', 'imprimante-hp-laserjet-m404n',
    22000, 18700, 10,
    ['https://images.unsplash.com/photo-1612815154858-60aa4c59eaa6?w=700&q=90'],
    'Imprimante HP LaserJet Pro M404n, 38ppm, USB/Ethernet, toner inclus. Cap-Haïtien.',
    'Cap-Haitien', 'Nord',
    { totalSold: 18, viewCount: 1700 });

  await ensureProduct(s13.id, catElec.id,
    'Switch TP-Link 8 Ports Gigabit', 'switch-tplink-8-ports-gigabit',
    4500, null, 20,
    ['https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=700&q=90'],
    'Switch réseau TP-Link 8 ports Gigabit, plug & play, boîtier métal. Cap-Haïtien.',
    'Cap-Haitien', 'Nord',
    { totalSold: 42, viewCount: 1100 });

  await ensureProduct(s13.id, catPhone.id,
    'Xiaomi Redmi Note 13 Pro 256GB', 'xiaomi-redmi-note13-pro-256gb',
    18500, 15725, 22,
    ['https://images.unsplash.com/photo-1512054502232-10a0a035d672?w=700&q=90'],
    'Xiaomi Redmi Note 13 Pro 256GB, caméra 200MP, charge 67W, AMOLED 120Hz.',
    'Cap-Haitien', 'Nord',
    { totalSold: 35, viewCount: 4200, isFeatured: true });

  // ════════════════════════════════════════════════════════════════════════
  // PRODUITS S14 — PAP Mode (Port-au-Prince)
  // ════════════════════════════════════════════════════════════════════════
  await ensureProduct(s14.id, catVetement.id,
    'Ensemble Tailleur Femme Beige', 'ensemble-tailleur-femme-beige',
    12000, 10200, 20,
    ['https://images.unsplash.com/photo-1594938298603-c8148c4b4098?w=700&q=90'],
    'Ensemble tailleur femme beige, veste + pantalon, tissu stretch, tailles 36-46.',
    'Port-au-Prince', 'Ouest',
    { totalSold: 33, viewCount: 2900, isFeatured: true });

  await ensureProduct(s14.id, catBeaute.id,
    'Bijoux Set Collier Boucles Or 18K', 'bijoux-set-collier-boucles-or-18k',
    9500, null, 12,
    ['https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=700&q=90'],
    'Set bijoux plaqué or 18K : collier + boucles assorties, boite cadeau incluse.',
    'Port-au-Prince', 'Ouest',
    { totalSold: 58, viewCount: 3500, isFeatured: true });

  await ensureProduct(s14.id, catVetement.id,
    'Jean Skinny Femme Bleu Délavé', 'jean-skinny-femme-bleu-delave',
    5500, 4675, 35,
    ['https://images.unsplash.com/photo-1541099649105-f69ad21f3246?w=700&q=90'],
    'Jean skinny femme bleu délavé, taille haute, stretch, tailles 34 à 46.',
    'Port-au-Prince', 'Ouest',
    { totalSold: 91, viewCount: 2200 });

  await ensureProduct(s14.id, catBeaute.id,
    'Palette Ombres à Paupières 18 Teintes', 'palette-ombres-18-teintes',
    3800, 3230, 30,
    ['https://images.unsplash.com/photo-1512496015851-a90fb38ba796?w=700&q=90'],
    'Palette 18 teintes ombres à paupières, mat et shimmer, longue tenue 24h.',
    'Port-au-Prince', 'Ouest',
    { totalSold: 76, viewCount: 1800 });

  console.log('OK Products S11-S14');

  // ════════════════════════════════════════════════════════════════════════
  // PROMOTIONS — salePrice 10-20% sous le prix normal
  // ════════════════════════════════════════════════════════════════════════

  await ensureProduct(s8.id, catVetement.id,
    'Pyjama Femme Satin Rose', 'pyjama-femme-satin-rose',
    3200, 2720, 30,
    ['https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=700&q=90'],
    'Pyjama femme satin rose, ensemble haut + pantalon, taille S/M/L/XL.',
    'Saint-Marc', 'Artibonite',
    { totalSold: 23, viewCount: 980 });

  await ensureProduct(s9.id, catBeaute.id,
    'Huile de Coco Naturelle 500ml', 'huile-coco-naturelle-500ml',
    1500, 1275, 80,
    ['https://images.unsplash.com/photo-1540202404-1b927e27fa8b?w=700&q=90'],
    'Huile de coco vierge 100% naturelle 500ml, Grand\'Anse. Cheveux, peau et cuisine.',
    'Jeremie', 'Grand-Anse',
    { totalSold: 65, viewCount: 1400 });

  await ensureProduct(s10.id, catElec.id,
    'Chargeur Solaire 20W Portable', 'chargeur-solaire-20w',
    4500, 3825, 25,
    ['https://images.unsplash.com/photo-1508514177221-188b1cf16e9d?w=700&q=90'],
    'Panneau solaire portable 20W, 2 ports USB, idéal zones sans électricité. Fort-Liberté.',
    'Fort-Liberte', 'Nord-Est',
    { totalSold: 38, viewCount: 2200 });

  await ensureProduct(s7.id, catChaussure.id,
    'Sneakers Nike Air Max 270 React', 'nike-air-max-270-react',
    18500, 15725, 20,
    ['https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=700&q=90'],
    'Nike Air Max 270 React, pointures 38-46, plusieurs coloris. Limonade, Nord.',
    'Limonade', 'Nord',
    { totalSold: 29, viewCount: 1900 });

  await ensureProduct(s8.id, catAlim.id,
    'Haricots Rouges Locaux 5kg', 'haricots-rouges-locaux-5kg',
    950, 808, 200,
    ['https://images.unsplash.com/photo-1515942661900-94b3d1972591?w=700&q=90'],
    'Haricots rouges locaux 5kg, récolte Artibonite, secs et propres. Livraison Saint-Marc.',
    'Saint-Marc', 'Artibonite',
    { totalSold: 120, viewCount: 750 });

  await ensureProduct(s5.id, catMaison.id,
    'Ventilateur Sur Pied 16 pouces', 'ventilateur-sur-pied-16p',
    5800, 4930, 18,
    ['https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=700&q=90'],
    'Ventilateur sur pied 16 pouces, 3 vitesses, oscillation 90°, silencieux.',
    'Les Cayes', 'Sud',
    { totalSold: 47, viewCount: 1200 });

  await ensureProduct(s6.id, catVetement.id,
    'Short Sport Homme DryFit', 'short-sport-dryfit',
    1800, 1530, 50,
    ['https://images.unsplash.com/photo-1591195853828-11db59a44f43?w=700&q=90'],
    'Short sport DryFit homme, évacuation humidité, tailles S-XXL, 4 couleurs.',
    'Jacmel', 'Sud-Est',
    { totalSold: 82, viewCount: 860 });

  await ensureProduct(s9.id, catBeaute.id,
    'Savon Artisanal Vetiver Haïtien', 'savon-artisanal-vetiver',
    450, 382, 150,
    ['https://images.unsplash.com/photo-1607006344380-b6775a0824a7?w=700&q=90'],
    'Savon artisanal au vétiver haïtien, fait main Grand\'Anse, 100% naturel, 120g.',
    'Jeremie', 'Grand-Anse',
    { totalSold: 210, viewCount: 680 });

  console.log('OK Promo products');

  // ════════════════════════════════════════════════════════════════════════
  // TENDANCES — viewCount élevé (1500-8000), très vus
  // ════════════════════════════════════════════════════════════════════════

  await ensureProduct(s1.id, catPhone.id,
    'iPhone 15 128GB Rose', 'iphone-15-128gb-rose',
    68000, 62000, 12,
    ['https://images.unsplash.com/photo-1695048132989-aa3c6f8e8aca?w=700&q=90'],
    'iPhone 15 128GB rose, Dynamic Island, caméra 48MP, puce A16 Bionic, USB-C.',
    'Port-au-Prince', 'Ouest',
    { totalSold: 35, viewCount: 7800, isFeatured: true, isSponsored: true });

  await ensureProduct(s3.id, catVehicle.id,
    'Kia Picanto 2023 Automatique Neuve', 'kia-picanto-2023-auto',
    1450000, 1310000, 2,
    ['https://images.unsplash.com/photo-1494976388531-d1058494cdd8?w=700&q=90'],
    'Kia Picanto 2023, automatique, 0km, climatisation, Bluetooth. Dossier complet.',
    'Petionville', 'Ouest',
    { totalSold: 3, viewCount: 6500, isFeatured: true });

  await ensureProduct(s2.id, catVetement.id,
    'Ensemble Survêtement Femme Nike', 'ensemble-survetement-femme-nike',
    9500, 8075, 25,
    ['https://images.unsplash.com/photo-1519311965067-36d3e5f33d39?w=700&q=90'],
    'Ensemble survêtement femme Nike, veste zip + legging, plusieurs couleurs. Cap-Haïtien.',
    'Cap-Haitien', 'Nord',
    { totalSold: 41, viewCount: 5900, isFeatured: true });

  await ensureProduct(s7.id, catElec.id,
    'Onduleur APC 1200VA Smart', 'onduleur-apc-1200va',
    22000, 18700, 8,
    ['https://images.unsplash.com/photo-1601524909162-ae8725290836?w=700&q=90'],
    'Onduleur APC Smart-UPS 1200VA, 8 prises, écran LCD, protection surtension. Nord.',
    'Limonade', 'Nord',
    { totalSold: 15, viewCount: 5400, isFeatured: true });

  await ensureProduct(s4.id, catElec.id,
    'Panneau Solaire 400W Monocristallin', 'panneau-solaire-400w',
    28000, 23800, 15,
    ['https://images.unsplash.com/photo-1509391366360-2e959784a276?w=700&q=90'],
    'Panneau solaire monocristallin 400W, haut rendement 21%, cadre aluminium. Gonaïves.',
    'Gonaives', 'Artibonite',
    { totalSold: 22, viewCount: 4800, isFeatured: true, isSponsored: true });

  await ensureProduct(s5.id, catMeuble.id,
    'Lit Plateforme 180x200 Design', 'lit-plateforme-180x200',
    55000, 46750, 4,
    ['https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?w=700&q=90'],
    'Lit plateforme king size 180x200, bois laqué blanc, têtede lit rembourré.',
    'Les Cayes', 'Sud',
    { totalSold: 9, viewCount: 4200 });

  await ensureProduct(s6.id, catBeaute.id,
    'Parfum Femme Lancôme La Vie Est Belle 75ml', 'parfum-lancome-la-vie-est-belle',
    12500, 10625, 20,
    ['https://images.unsplash.com/photo-1541643600914-78b084683702?w=700&q=90'],
    'Parfum Lancôme La Vie Est Belle EDP 75ml, notes iris, praline, vanille.',
    'Jacmel', 'Sud-Est',
    { totalSold: 48, viewCount: 3700, isFeatured: true });

  await ensureProduct(s8.id, catMaison.id,
    'Climatiseur Split 12000 BTU WiFi', 'climatiseur-split-12000btu',
    42000, 35700, 6,
    ['https://images.unsplash.com/photo-1585771724684-38269d6639fd?w=700&q=90'],
    'Climatiseur split 12000 BTU WiFi, inverter, A++, silencieux. Saint-Marc, Artibonite.',
    'Saint-Marc', 'Artibonite',
    { totalSold: 12, viewCount: 3400, isFeatured: true });

  console.log('OK Trending products');

  // ════════════════════════════════════════════════════════════════════════
  // NOUVEAUX ARRIVAGES — stock élevé, totalSold bas (nouveaux)
  // ════════════════════════════════════════════════════════════════════════

  await ensureProduct(s7.id, catPhone.id,
    'Nothing Phone (2a) 256GB Blanc', 'nothing-phone-2a-256gb',
    32000, 28800, 30,
    ['https://images.unsplash.com/photo-1512054502232-10a0a035d672?w=700&q=90'],
    'Nothing Phone (2a) 256GB blanc, écran AMOLED 120Hz, Glyph Interface, batterie 5000mAh.',
    'Limonade', 'Nord',
    { totalSold: 2, viewCount: 450, isFeatured: false });

  await ensureProduct(s10.id, catElec.id,
    'Laptop Lenovo IdeaPad Slim 5 Intel i5', 'lenovo-ideapad-slim5-i5',
    58000, 51200, 10,
    ['https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=700&q=90'],
    'Lenovo IdeaPad Slim 5, Intel Core i5-13420H, 16GB RAM, 512GB SSD, Win11. Fort-Liberté.',
    'Fort-Liberte', 'Nord-Est',
    { totalSold: 1, viewCount: 320, isFeatured: false });

  await ensureProduct(s9.id, catVetement.id,
    'Sac à Main Cuir Femme Artisanal', 'sac-main-cuir-artisanal',
    6500, null, 15,
    ['https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=700&q=90'],
    'Sac à main cuir véritable marron, fabriqué Jérémie, Grand\'Anse. Couture main, doublure tissu.',
    'Jeremie', 'Grand-Anse',
    { totalSold: 0, viewCount: 180, isFeatured: false });

  await ensureProduct(s8.id, catMaison.id,
    'Purificateur Air HEPA 360m³/h', 'purificateur-air-hepa',
    18500, 15725, 12,
    ['https://images.unsplash.com/photo-1585771724684-38269d6639fd?w=700&q=90'],
    'Purificateur d\'air HEPA H13, 360m³/h, filtre PM2.5, saint-Marc. Silencieux 25dB.',
    'Saint-Marc', 'Artibonite',
    { totalSold: 3, viewCount: 240, isFeatured: false });

  await ensureProduct(s1.id, catElec.id,
    'Ring Doorbell Pro 2 Vidéo WiFi', 'ring-doorbell-pro2',
    18000, 15300, 8,
    ['https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=700&q=90'],
    'Ring Video Doorbell Pro 2, 1536p HD, détection mouvement 3D, WiFi. Port-au-Prince.',
    'Port-au-Prince', 'Ouest',
    { totalSold: 4, viewCount: 390, isFeatured: false });

  await ensureProduct(s3.id, catElec.id,
    'Robot Aspirateur Roborock S7 MaxV', 'roborock-s7-maxv',
    68000, 57800, 5,
    ['https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=700&q=90'],
    'Roborock S7 MaxV, LiDAR navigation, aspiration 5100Pa, lavage ultrasonique. Pétion-Ville.',
    'Petionville', 'Ouest',
    { totalSold: 2, viewCount: 510, isFeatured: false });

  console.log('OK New arrivals');

  // ════════════════════════════════════════════════════════════════════════
  // LES PLUS VENDUS — totalSold élevé (80-500+)
  // ════════════════════════════════════════════════════════════════════════

  await ensureProduct(s4.id, catAlim.id,
    'Eau Minérale Culligan 18.9L', 'eau-minerale-culligan-189l',
    280, 250, 500,
    ['https://images.unsplash.com/photo-1616118132534-381148898bb4?w=700&q=90'],
    'Eau minérale Culligan bonbonne 18.9L, livrée Gonaïves et environs. Commander par pack de 5.',
    'Gonaives', 'Artibonite',
    { totalSold: 485, viewCount: 1200 });

  await ensureProduct(s4.id, catAlim.id,
    'Sucre Blanc Local 50kg', 'sucre-blanc-local-50kg',
    2200, 1980, 100,
    ['https://images.unsplash.com/photo-1559656914-a30970c1affd?w=700&q=90'],
    'Sucre blanc local qualité supérieure 50kg. Grossiste et détail, Gonaïves.',
    'Gonaives', 'Artibonite',
    { totalSold: 342, viewCount: 890 });

  await ensureProduct(s2.id, catVetement.id,
    'Uniforme Scolaire Complet Bleu Marine', 'uniforme-scolaire-bleu-marine',
    2800, 2380, 200,
    ['https://images.unsplash.com/photo-1622022093500-04edd0ac0e99?w=700&q=90'],
    'Uniforme scolaire complet bleu marine, chemise + pantalon/jupe, tailles 4 à 16 ans.',
    'Cap-Haitien', 'Nord',
    { totalSold: 289, viewCount: 1650 });

  await ensureProduct(s8.id, catAlim.id,
    'Pâtes Alimentaires Macaroni 5kg', 'macaroni-5kg',
    850, null, 300,
    ['https://images.unsplash.com/photo-1555949258-eb67b1ef0ceb?w=700&q=90'],
    'Macaroni pâtes alimentaires 5kg, qualité premium. Disponible en gros. Saint-Marc.',
    'Saint-Marc', 'Artibonite',
    { totalSold: 276, viewCount: 720 });

  await ensureProduct(s5.id, catMaison.id,
    'Matelas Mousse Haute Densité 160x200', 'matelas-mousse-hd-160x200',
    22000, 19800, 20,
    ['https://images.unsplash.com/photo-1631049552057-403cdb8f0658?w=700&q=90'],
    'Matelas mousse haute densité 160x200x20cm, ferme, fondation ressorts. Les Cayes, livraison Sud.',
    'Les Cayes', 'Sud',
    { totalSold: 198, viewCount: 1350 });

  await ensureProduct(s7.id, catPhone.id,
    'Batterie Externe Anker 20000mAh', 'batterie-externe-anker-20000',
    4500, 3825, 60,
    ['https://images.unsplash.com/photo-1585386959984-a4155224a1ad?w=700&q=90'],
    'Power bank Anker 20000mAh, charge rapide 20W, 2 USB-A + USB-C, Limonade.',
    'Limonade', 'Nord',
    { totalSold: 187, viewCount: 2100 });

  await ensureProduct(s6.id, catBeaute.id,
    'Crème Hydratante Corps Karité 500ml', 'creme-karite-corps-500ml',
    1200, 1020, 150,
    ['https://images.unsplash.com/photo-1556228578-8c89e6adf883?w=700&q=90'],
    'Crème corps karité pur 500ml, texture légère, parfum délicat. Jacmel, Sud-Est.',
    'Jacmel', 'Sud-Est',
    { totalSold: 163, viewCount: 940 });

  await ensureProduct(s9.id, catAlim.id,
    'Café Moulu Grand\'Anse Premium 250g', 'cafe-moulu-grandanse-250g',
    900, 765, 200,
    ['https://images.unsplash.com/photo-1447933601403-0c6688de566e?w=700&q=90'],
    'Café arabica moulu Grand\'Anse, terroir Jérémie, torréfaction artisanale. 250g.',
    'Jeremie', 'Grand-Anse',
    { totalSold: 158, viewCount: 1100 });

  await ensureProduct(s4.id, catVetement.id,
    'Claquettes Adidas Adilette Slide', 'claquettes-adidas-adilette',
    2200, 1870, 80,
    ['https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=700&q=90'],
    'Adidas Adilette Slide, semelle EVA, sangle large, pointures 36-47. Gonaïves.',
    'Gonaives', 'Artibonite',
    { totalSold: 144, viewCount: 1480 });

  await ensureProduct(s10.id, catMaison.id,
    'Groupe Électrogène Honda 3500W', 'groupe-electrogene-honda-3500w',
    85000, 76500, 8,
    ['https://images.unsplash.com/photo-1622819584099-e04ccb14e8f7?w=700&q=90'],
    'Générateur Honda 3500W, silencieux, économique, démarrage facile. Nord-Est.',
    'Fort-Liberte', 'Nord-Est',
    { totalSold: 95, viewCount: 3200, isFeatured: true });

  console.log('OK Best sellers');

  // ════════════════════════════════════════════════════════════════════════
  // PUBLICITES (AdCampaign) — 6 vendeurs avec campagnes actives
  // ════════════════════════════════════════════════════════════════════════

  const allSellers = await Promise.all([
    prisma.seller.findFirst({ where: { stores: { some: { id: s1.id } } } }),
    prisma.seller.findFirst({ where: { stores: { some: { id: s2.id } } } }),
    prisma.seller.findFirst({ where: { stores: { some: { id: s3.id } } } }),
    prisma.seller.findFirst({ where: { stores: { some: { id: s7.id } } } }),
    prisma.seller.findFirst({ where: { stores: { some: { id: s8.id } } } }),
    prisma.seller.findFirst({ where: { stores: { some: { id: s4.id } } } }),
  ]);

  const adProducts = [pFlash1, pFlash3, pFlash6, pFlash2, pFlash5, pFlash4];
  const adTargets  = [
    ['Ouest', 'Sud-Est'],
    ['Ouest', 'Nord', 'Artibonite'],
    ['Ouest'],
    ['Nord', 'Nord-Est', 'Nord-Ouest'],
    ['Artibonite', 'Centre', 'Ouest'],
    ['Artibonite', 'Nord', 'Ouest'],
  ];

  const adStart = new Date();
  const adEnd   = new Date(Date.now() + 30 * 24 * 3600 * 1000);

  for (let i = 0; i < allSellers.length; i++) {
    const seller2 = allSellers[i];
    const product = adProducts[i];
    if (!seller2 || !product) continue;
    const existingAd = await (prisma.adCampaign as any).findFirst({
      where: { sellerId: seller2.id, productId: product.id },
    });
    if (!existingAd) {
      await (prisma.adCampaign as any).create({
        data: {
          sellerId: seller2.id,
          productId: product.id,
          name: `Campagne Flash — ${product.name.substring(0, 40)}`,
          objective: 'TRAFFIC',
          status: 'ACTIVE',
          totalBudget: 5000 + i * 1000,
          dailyBudget: 200 + i * 50,
          spent: Math.floor(Math.random() * 1500),
          startDate: adStart,
          endDate:   adEnd,
          targetDepts: JSON.stringify(adTargets[i]),
          impressions: Math.floor(Math.random() * 8000) + 1000,
          clicks:      Math.floor(Math.random() * 400) + 50,
          conversions: Math.floor(Math.random() * 30) + 5,
        },
      });
    }
  }
  console.log('OK Ad campaigns');

  // ════════════════════════════════════════════════════════════════════════
  // Mise à jour produits existants (totalSold + viewCount pour les stats)
  // ════════════════════════════════════════════════════════════════════════
  const updates: Array<{ slug: string; totalSold: number; viewCount: number }> = [
    { slug: 'iphone-15-pro-max-256gb',     totalSold: 18,  viewCount: 4200 },
    { slug: 'samsung-galaxy-s24-ultra-512gb', totalSold: 24, viewCount: 3800 },
    { slug: 'macbook-air-m2-256gb',        totalSold: 12,  viewCount: 3500 },
    { slug: 'tv-samsung-55-qled-4k',       totalSold: 15,  viewCount: 2900 },
    { slug: 'toyota-corolla-2020-auto',    totalSold: 2,   viewCount: 5800 },
    { slug: 'iphone-14-128gb-noir',        totalSold: 22,  viewCount: 3100 },
    { slug: 'robe-soiree-longue-rouge',    totalSold: 38,  viewCount: 1700 },
    { slug: 'canape-3-places-velours-gris',totalSold: 14,  viewCount: 1400 },
    { slug: 'rhum-barbancourt-15ans',      totalSold: 95,  viewCount: 1100 },
    { slug: 'costume-homme-bleu-marine-3p',totalSold: 27,  viewCount: 1600 },
    { slug: 'ipad-air-5-64gb-wifi',        totalSold: 19,  viewCount: 2400 },
    { slug: 'ps5-slim-1tb',               totalSold: 8,   viewCount: 4800 },
    { slug: 'robe-mariee-princesse-ivoire',totalSold: 5,   viewCount: 2200 },
    { slug: 'panneau-solaire-400w',        totalSold: 31,  viewCount: 3600 },
  ];
  for (const u of updates) {
    const p = await prisma.product.findUnique({ where: { slug: u.slug } });
    if (p) {
      await (prisma.product as any).update({
        where: { id: p.id },
        data: { totalSold: u.totalSold, viewCount: u.viewCount },
      });
    }
  }
  console.log('OK Stats updated');

  console.log('\n╔══════════════════════════════════════════════════════╗');
  console.log('║          COMPTES DEALPAM — CREDENTIALS               ║');
  console.log('╠══════════════════════════════════════════════════════╣');
  console.log('║ ADMIN                                                 ║');
  console.log('║  admin@dealpam.com          / Admin@2025             ║');
  console.log('╠══════════════════════════════════════════════════════╣');
  console.log('║ CLIENT TEST                                           ║');
  console.log('║  client@dealpam.com         / Client@2025            ║');
  console.log('╠══════════════════════════════════════════════════════╣');
  console.log('║ VENDEURS (mot de passe: Seller@2025 pour tous)       ║');
  console.log('║  rico.tech@dealpam.com      Port-au-Prince — ELITE   ║');
  console.log('║  mode.chic@dealpam.com      Cap-Haïtien  — BUSINESS  ║');
  console.log('║  auto.plus@dealpam.com      Pétion-Ville — ELITE     ║');
  console.log('║  gonaives.market@dealpam.com Gonaïves    — STARTER   ║');
  console.log('║  cayes.shop@dealpam.com     Les Cayes   — BUSINESS   ║');
  console.log('║  jacmel.boutique@dealpam.com Jacmel      — STARTER   ║');
  console.log('║  technord@dealpam.com       Limonade    — BUSINESS   ║');
  console.log('║  saintmarc.market@dealpam.com Saint-Marc — BUSINESS  ║');
  console.log('║  grandanse.style@dealpam.com  Jérémie   — STARTER   ║');
  console.log('║  nordest.plus@dealpam.com   Fort-Liberté— STARTER   ║');
  console.log('║  sudmarket.cayes@dealpam.com Les Cayes 2 — BUSINESS  ║');
  console.log('║  petionshop@dealpam.com     Pétion-Ville— STARTER   ║');
  console.log('║  capnord.tech@dealpam.com   Cap-Haïtien — BUSINESS  ║');
  console.log('║  papmode@dealpam.com        Port-au-Prince— BUSINESS ║');
  console.log('╚══════════════════════════════════════════════════════╝');
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
