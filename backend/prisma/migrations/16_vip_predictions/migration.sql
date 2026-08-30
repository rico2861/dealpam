-- Pivot pronostics VIP : nouveau type de produit "pronostic" et abonnement
-- VIP cote client (distinct de seller_subscriptions qui appartient au vendeur).
ALTER TYPE "ProductType" ADD VALUE IF NOT EXISTS 'PREDICTION';

CREATE TABLE IF NOT EXISTS "vip_subscriptions" (
  "id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "start_date" TIMESTAMP(3),
  "end_date" TIMESTAMP(3),
  "auto_renew" BOOLEAN NOT NULL DEFAULT false,
  "price_htg" DECIMAL(10,2) NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "vip_subscriptions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "vip_subscriptions_user_id_idx" ON "vip_subscriptions"("user_id");
CREATE INDEX IF NOT EXISTS "vip_subscriptions_status_idx" ON "vip_subscriptions"("status");

DO $$ BEGIN
  ALTER TABLE "vip_subscriptions" ADD CONSTRAINT "vip_subscriptions_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
