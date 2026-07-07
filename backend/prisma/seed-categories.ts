import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const CATEGORIES = [
  { name: 'Smartphones',       slug: 'smartphones',  sortOrder: 1 },
  { name: 'Véhicules',         slug: 'vehicules',    sortOrder: 2 },
  { name: 'Meubles',           slug: 'meubles',      sortOrder: 3 },
  { name: 'Vêtements',         slug: 'vetements',    sortOrder: 4 },
  { name: 'Électronique',      slug: 'electronique', sortOrder: 5 },
  { name: 'Maison',            slug: 'maison',       sortOrder: 6 },
  { name: 'Beauté',            slug: 'beaute',       sortOrder: 7 },
  { name: 'Chaussures',        slug: 'chaussures',   sortOrder: 8 },
  { name: 'Sport',             slug: 'sport',        sortOrder: 9 },
  { name: 'Alimentation',      slug: 'alimentation', sortOrder: 10 },
  { name: 'Services',         slug: 'services',     sortOrder: 11 },
  { name: 'Bijoux',            slug: 'bijoux',       sortOrder: 12 },
  { name: 'Sacs',              slug: 'sacs',         sortOrder: 13 },
  { name: 'Jeux & Jouets',     slug: 'jeux',         sortOrder: 14 },
  { name: 'Santé & Bien-être', slug: 'sante',        sortOrder: 15 },
  { name: 'Livres',            slug: 'livres',       sortOrder: 16 },
  { name: 'Restaurants',       slug: 'restaurants',  sortOrder: 17 },
  { name: 'Immobilier',        slug: 'immobilier',   sortOrder: 18 },
  { name: 'Autres',            slug: 'autres',       sortOrder: 99 },
];

async function main() {
  for (const c of CATEGORIES) {
    await prisma.category.upsert({
      where: { slug: c.slug },
      update: { name: c.name, sortOrder: c.sortOrder },
      create: c,
    });
  }
  console.log(`✅ ${CATEGORIES.length} catégories vérifiées/créées`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
