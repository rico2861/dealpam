-- Pivot pronostics VIP, étape 2 : la table des pronostics eux-mêmes
-- (publiés par un admin/super admin, réservés aux abonnés VIP actifs).
CREATE TABLE IF NOT EXISTS "predictions" (
  "id" TEXT NOT NULL,
  "competition" TEXT NOT NULL,
  "home_team" TEXT NOT NULL,
  "away_team" TEXT NOT NULL,
  "match_date" TIMESTAMP(3) NOT NULL,
  "market" TEXT NOT NULL,
  "pick" TEXT NOT NULL,
  "odds" DECIMAL(6,2) NOT NULL,
  "confidence" INTEGER NOT NULL,
  "note" TEXT,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "created_by_id" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "predictions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "predictions_match_date_idx" ON "predictions"("match_date");
CREATE INDEX IF NOT EXISTS "predictions_status_idx" ON "predictions"("status");

DO $$ BEGIN
  ALTER TABLE "predictions" ADD CONSTRAINT "predictions_created_by_id_fkey"
    FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
