-- Deduplication des vues produit + abonnement client a une boutique
ALTER TABLE stores ADD COLUMN IF NOT EXISTS followers_count INTEGER NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS product_views (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  viewer_key TEXT NOT NULL,
  created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS product_views_product_id_viewer_key_created_at_idx
  ON product_views (product_id, viewer_key, created_at);

CREATE TABLE IF NOT EXISTS store_follows (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  store_id TEXT NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT store_follows_user_id_store_id_key UNIQUE (user_id, store_id)
);
CREATE INDEX IF NOT EXISTS store_follows_store_id_idx ON store_follows (store_id);
