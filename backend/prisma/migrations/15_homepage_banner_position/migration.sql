ALTER TABLE homepage_banners ADD COLUMN IF NOT EXISTS position TEXT NOT NULL DEFAULT 'HERO';
CREATE INDEX IF NOT EXISTS "homepage_banners_position_idx" ON homepage_banners(position);
