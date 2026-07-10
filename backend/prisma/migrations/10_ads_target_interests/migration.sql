-- Ajoute le ciblage manuel par centres d'intérêt aux campagnes publicitaires.
-- Simple liste de tags choisie par le vendeur (pas d'inférence comportementale/ML).
ALTER TABLE "ad_campaigns" ADD COLUMN IF NOT EXISTS "target_interests" TEXT[] NOT NULL DEFAULT '{}';
