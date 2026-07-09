-- Réglages de tarification publicitaire éditables depuis le panneau admin
-- (remplace les constantes CPM/CPC/budget minimum codées en dur dans
-- ads.service.ts). Une seule ligne utilisée en pratique (id 'default').
CREATE TABLE IF NOT EXISTS "ad_settings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "min_budget_htg" DECIMAL(10,2) NOT NULL DEFAULT 250,
    "cpm_rate_htg" DECIMAL(10,2) NOT NULL DEFAULT 150,
    "cpc_rate_htg" DECIMAL(10,2) NOT NULL DEFAULT 25,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ad_settings_pkey" PRIMARY KEY ("id")
);

INSERT INTO "ad_settings" ("id", "min_budget_htg", "cpm_rate_htg", "cpc_rate_htg", "updated_at")
VALUES ('default', 250, 150, 25, NOW())
ON CONFLICT ("id") DO NOTHING;
