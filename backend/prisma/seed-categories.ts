import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const CATEGORIES = [
  { name: 'Smartphones',  slug: 'smartphones',  sortOrder: 1 },
  { name: 'Vehicules',    slug: 'vehicules',    sortOrder: 2 },
  { name: 'Meubles',      slug: 'meubles',      sortOrder: 3 },
  { name: 'Vetements',    slug: 'vetements',    sortOrder: 4 },
  { name: 'Electronique', slug: 'electronique', sortOrder: 5 },
  { name: 'Maison',       slug: 'maison',       sortOrder: 6 },
  { name: 'Beaute',       slug: 'beaute',       sortOrder: 7 },
  { name: 'Chaussures',   slug: 'chaussures',   sortOrder: 8 },
  { name: 'Sport',        slug: 'sport',        sortOrder: 9 },
  { name: 'Alimentation', slug: 'alimentation', sortOrder: 10 },
  { name: 'Services',     slug: 'services',     sortOrder: 11 },
];

async function main() {
  for (const c of CATEGORIES) {
    await prisma.category.upsert({
      where: { slug: c.slug },
      update: {},
      create: c,
    });
  }
  console.log(`✅ ${CATEGORIES.length} catégories vérifiées/créées`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
