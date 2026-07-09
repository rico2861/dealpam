-- Patente commerciale validée (optionnelle) — badge de crédibilité distinct du badge "Vérifié"
ALTER TABLE "stores" ADD COLUMN IF NOT EXISTS "has_verified_patente" BOOLEAN NOT NULL DEFAULT false;
