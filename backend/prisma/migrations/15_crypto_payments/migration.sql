-- Paiement crypto (NOWPayments) -- meme pattern que MonCash : verification
-- serveur-a-serveur (IPN) avant creation de la commande, jamais avant.
ALTER TYPE "PaymentMethod" ADD VALUE IF NOT EXISTS 'CRYPTO';
ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "nowpayments_id" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "payments_nowpayments_id_key" ON "payments"("nowpayments_id");
