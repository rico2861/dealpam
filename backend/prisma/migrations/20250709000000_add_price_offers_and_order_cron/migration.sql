-- À coller dans Supabase → SQL Editor → New query, puis "Run".
-- Idempotent : peut être relancé sans risque (IF NOT EXISTS partout).

-- ── Product : négociation de prix ("faire une offre") ──────────────────────
ALTER TABLE "products"
  ADD COLUMN IF NOT EXISTS "allow_offers" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "min_offer_price_htg" NUMERIC(10,2);

-- ── CartItem : prix négocié en attente de commande ──────────────────────────
ALTER TABLE "cart_items"
  ADD COLUMN IF NOT EXISTS "offered_price" NUMERIC(10,2);

-- ── OrderItem : offre attachée à un article de commande ─────────────────────
ALTER TABLE "order_items"
  ADD COLUMN IF NOT EXISTS "offered_price" NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS "offer_status" TEXT,
  ADD COLUMN IF NOT EXISTS "offer_rejection_reason" TEXT;

-- ── Order : motif d'annulation + anti-doublon relance cron ──────────────────
ALTER TABLE "orders"
  ADD COLUMN IF NOT EXISTS "cancel_reason" TEXT,
  ADD COLUMN IF NOT EXISTS "reminder_sent_at" TIMESTAMP(3);
