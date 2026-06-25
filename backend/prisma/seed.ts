import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  // Subscription plans
  await prisma.subscriptionPlan.upsert({ where: { tier: 'STARTER' }, create: { tier: 'STARTER', name: 'Plan Starter', priceHTG: 500, maxProducts: 50, maxImages: 5, description: '50 produits · 5 images/produit' }, update: {} });
  await prisma.subscriptionPlan.upsert({ where: { tier: 'BUSINESS' }, create: { tier: 'BUSINESS', name: 'Plan Business', priceHTG: 1000, maxProducts: 130, maxImages: 10, hasVerifiedBadge: true, hasAdvancedStats: true, description: '130 produits · Badge vérifié' }, update: {} });
  await prisma.subscriptionPlan.upsert({ where: { tier: 'PREMIUM' }, create: { tier: 'PREMIUM', name: 'Plan Premium', priceHTG: 2500, maxProducts: 300, maxImages: 10, hasVerifiedBadge: true, hasPrioritySearch: true, hasAdvancedStats: true, description: '300 produits · Priorité recherche' }, update: {} });
  await prisma.subscriptionPlan.upsert({ where: { tier: 'ELITE' }, create: { tier: 'ELITE', name: 'Plan Elite', priceHTG: 5000, maxProducts: null, maxImages: 15, hasVerifiedBadge: true, hasEliteBadge: true, hasPrioritySearch: true, hasHomepageAd: true, hasAdvancedStats: true, hasAutoSponsored: true, description: 'Produits illimités · Badge Elite · Accueil' }, update: {} });

  // Categories
  const cats = [
    { name: 'Vêtements', slug: 'vetements', sortOrder: 1 },
    { name: 'Chaussures', slug: 'chaussures', sortOrder: 2 },
    { name: 'Sacs & Accessoires', slug: 'sacs-accessoires', sortOrder: 3 },
    { name: 'Parfums & Beauté', slug: 'parfums-beaute', sortOrder: 4 },
    { name: 'Bijoux', slug: 'bijoux', sortOrder: 5 },
    { name: 'Sport', slug: 'sport', sortOrder: 6 },
  ];
  for (const c of cats) {
    await prisma.category.upsert({ where: { slug: c.slug }, create: c, update: {} });
  }

  // Super Admin
  const hash = await bcrypt.hash('Admin@2024!', 12);
  await prisma.user.upsert({
    where: { email: 'admin@dealpam.com' },
    create: { email: 'admin@dealpam.com', passwordHash: hash, firstName: 'Super', lastName: 'Admin', role: 'SUPER_ADMIN', isEmailVerified: true },
    update: {},
  });

  console.log('Seed completed!');
}

main().catch(console.error).finally(() => prisma.$disconnect());
