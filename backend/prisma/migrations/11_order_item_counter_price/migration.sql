-- Contre-offre vendeur : dernier prix propose au client quand offerStatus = 'COUNTERED'
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS counter_price DECIMAL(10, 2);
