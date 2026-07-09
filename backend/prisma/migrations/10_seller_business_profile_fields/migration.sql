-- Nouvelles valeurs de l'enum BusinessType (plus de choix pour "Type d'activité")
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'AGRICULTURE' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'BusinessType')) THEN
    ALTER TYPE "BusinessType" ADD VALUE 'AGRICULTURE';
  END IF;
END $$;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'CONSTRUCTION' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'BusinessType')) THEN
    ALTER TYPE "BusinessType" ADD VALUE 'CONSTRUCTION';
  END IF;
END $$;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'EDUCATION' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'BusinessType')) THEN
    ALTER TYPE "BusinessType" ADD VALUE 'EDUCATION';
  END IF;
END $$;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'TRANSPORT' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'BusinessType')) THEN
    ALTER TYPE "BusinessType" ADD VALUE 'TRANSPORT';
  END IF;
END $$;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'TECHNOLOGY' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'BusinessType')) THEN
    ALTER TYPE "BusinessType" ADD VALUE 'TECHNOLOGY';
  END IF;
END $$;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'EVENTS' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'BusinessType')) THEN
    ALTER TYPE "BusinessType" ADD VALUE 'EVENTS';
  END IF;
END $$;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'REAL_ESTATE' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'BusinessType')) THEN
    ALTER TYPE "BusinessType" ADD VALUE 'REAL_ESTATE';
  END IF;
END $$;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'BEAUTY' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'BusinessType')) THEN
    ALTER TYPE "BusinessType" ADD VALUE 'BEAUTY';
  END IF;
END $$;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'ARTISANAT' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'BusinessType')) THEN
    ALTER TYPE "BusinessType" ADD VALUE 'ARTISANAT';
  END IF;
END $$;

-- Précision d'activité en texte libre quand "Autre" est choisi + CIN du vendeur
ALTER TABLE "sellers" ADD COLUMN IF NOT EXISTS "business_type_other" TEXT;
ALTER TABLE "sellers" ADD COLUMN IF NOT EXISTS "cin" TEXT;
