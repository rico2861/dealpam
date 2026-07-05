import { PrismaClient } from '@prisma/client';
import { MailService } from '../src/modules/mail/mail.service';
const prisma = new PrismaClient();
const mail = new MailService();

const TARGET_EMAIL = 'brezaultricho1@gmail.com';
const TRIAL_DAYS = 30;

async function main() {
  const user = await prisma.user.findUnique({ where: { email: TARGET_EMAIL } });
  if (!user) {
    console.log(`❌ Utilisateur ${TARGET_EMAIL} introuvable — rien à faire.`);
    return;
  }

  const seller = await prisma.seller.findUnique({ where: { userId: user.id } });
  if (!seller) {
    console.log(`❌ ${TARGET_EMAIL} n'a pas de compte vendeur (Seller) — impossible d'accorder un essai vendeur.`);
    return;
  }

  const existingActive = await prisma.sellerSubscription.findFirst({
    where: { sellerId: seller.id, isActive: true, endDate: { gt: new Date() } },
  });
  if (existingActive) {
    console.log(`ℹ️  ${TARGET_EMAIL} a déjà un abonnement actif — aucun essai accordé.`);
    return;
  }

  const plan = await prisma.subscriptionPlan.findUnique({ where: { tier: 'BUSINESS' } });
  if (!plan) {
    console.log('❌ Plan BUSINESS introuvable — impossible de créer l\'essai.');
    return;
  }

  const startDate = new Date();
  const endDate = new Date(startDate.getTime() + TRIAL_DAYS * 24 * 60 * 60 * 1000);

  await prisma.sellerSubscription.create({
    data: {
      sellerId: seller.id, planId: plan.id, startDate, endDate,
      isActive: true, autoRenew: false, billingCycle: 'MONTHLY', isTrial: true,
    },
  });
  await prisma.trialUsage.create({
    data: { sellerId: seller.id, phone: user.phone || null, email: user.email, nif: seller.nif || null },
  });

  const store = await prisma.store.findFirst({ where: { sellerId: seller.id, isPrimary: true } });
  await mail.sendSellerWelcomeTrial(user.email, user.firstName, store?.name || 'votre boutique', endDate);

  console.log(`✅ Essai gratuit 30 jours accordé à ${TARGET_EMAIL} — actif jusqu'au ${endDate.toISOString()} — email envoyé`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
