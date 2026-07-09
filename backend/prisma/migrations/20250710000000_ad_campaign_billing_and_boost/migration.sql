-- À coller dans Supabase → SQL Editor → New query, puis "Run".
-- Idempotent : peut être relancé sans risque (IF NOT EXISTS partout).

-- ── AdCampaign : facturation quotidienne + publication manuelle ─────────────
ALTER TABLE "ad_campaigns"
  ADD COLUMN IF NOT EXISTS "published_at" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "last_billed_date" TIMESTAMP(3);

-- ── Product : boost auto-expirant issu d'une campagne pub produit ───────────
ALTER TABLE "products"
  ADD COLUMN IF NOT EXISTS "ad_boosted_until" TIMESTAMP(3);

-- ── Store : boost auto-expirant issu d'une campagne pub boutique ────────────
ALTER TABLE "stores"
  ADD COLUMN IF NOT EXISTS "ad_boosted_until" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "products_ad_boosted_until_idx" ON "products"("ad_boosted_until");
CREATE INDEX IF NOT EXISTS "stores_ad_boosted_until_idx" ON "stores"("ad_boosted_until");
