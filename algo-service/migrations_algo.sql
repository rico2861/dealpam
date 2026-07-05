-- Add tables required by algo-service
-- Run on Hostinger after prisma migrate: psql $DATABASE_URL -f algo-service/migrations_algo.sql

-- Events comportementaux (source of truth pour ML)
CREATE TABLE IF NOT EXISTS user_events (
  id             UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        TEXT,
  session_id     TEXT         NOT NULL,
  event_type     TEXT         NOT NULL,   -- VIEW, CLICK, LIKE, ADD_CART, PURCHASE, SEARCH
  product_id     TEXT,
  category_slug  TEXT,
  search_query   TEXT,
  lat            DOUBLE PRECISION,
  lng            DOUBLE PRECISION,
  created_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ue_session    ON user_events(session_id);
CREATE INDEX IF NOT EXISTS idx_ue_user       ON user_events(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ue_product    ON user_events(product_id) WHERE product_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ue_created    ON user_events(created_at);
CREATE INDEX IF NOT EXISTS idx_ue_type       ON user_events(event_type);

-- Cache trending (1 row, upserted toutes les 5 min)
CREATE TABLE IF NOT EXISTS trending_cache (
  id         INTEGER PRIMARY KEY DEFAULT 1,
  data       JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Persistance de l'état du modèle collaboratif
CREATE TABLE IF NOT EXISTS ml_model_state (
  id         INTEGER PRIMARY KEY DEFAULT 1,
  state_json JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
