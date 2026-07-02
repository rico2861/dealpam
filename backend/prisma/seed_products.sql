-- ============================================================
-- DealPam Products SQL — coller dans Supabase Dashboard > SQL Editor
-- APRES avoir execute seed_supabase.sql
-- ============================================================

-- Helper: insert product + image in one go
-- On insere d'abord les produits, puis les images


-- Produit 1: iPhone 15 Pro Max 256GB
DO $$
DECLARE
  v_store_id  UUID;
  v_cat_id    UUID;
  v_prod_id   UUID;
  v_rating    NUMERIC;
BEGIN
  SELECT st.id INTO v_store_id
  FROM stores st JOIN sellers s ON s.id = st.seller_id
  JOIN users u ON u.id = s.user_id WHERE u.email = 'rico.tech@dealpam.com' AND st.is_primary = true LIMIT 1;

  SELECT id INTO v_cat_id FROM categories WHERE slug = 'smartphones' LIMIT 1;

  IF v_store_id IS NOT NULL AND v_cat_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM products WHERE slug = 'iphone-15-pro-max-256gb') THEN
      v_rating := 3.5 + random() * 1.5;
      INSERT INTO products (id, store_id, category_id, name, slug, description, price, sale_price, stock, status, avg_rating, total_reviews, view_count, is_featured, created_at, updated_at)
      VALUES (
        gen_random_uuid(), v_store_id, v_cat_id,
        'iPhone 15 Pro Max 256GB', 'iphone-15-pro-max-256gb', 'iPhone 15 Pro Max 256GB titane naturel, puce A17 Pro, camera 48MP, 5G',
        85000, 79000, 8, 'PUBLISHED',
        ROUND(v_rating::numeric, 1),
        (floor(random() * 120) + 5)::int,
        (floor(random() * 800) + 20)::int,
        (random() > 0.75),
        NOW(), NOW()
      ) RETURNING id INTO v_prod_id;

      INSERT INTO product_images (id, product_id, url_full, url_medium, url_thumb, public_id, is_primary, sort_order, created_at, updated_at)
      VALUES (gen_random_uuid(), v_prod_id, 'https://images.unsplash.com/photo-1678685888221-cda773a3dcdb?w=700&q=90', 'https://images.unsplash.com/photo-1678685888221-cda773a3dcdb?w=700&q=90', 'https://images.unsplash.com/photo-1678685888221-cda773a3dcdb?w=700&q=90', 'seed_iphone-15-pro-max-256gb', true, 0, NOW(), NOW());
    END IF;
  END IF;
END $$;


-- Produit 2: Samsung Galaxy S24 Ultra 512GB
DO $$
DECLARE
  v_store_id  UUID;
  v_cat_id    UUID;
  v_prod_id   UUID;
  v_rating    NUMERIC;
BEGIN
  SELECT st.id INTO v_store_id
  FROM stores st JOIN sellers s ON s.id = st.seller_id
  JOIN users u ON u.id = s.user_id WHERE u.email = 'rico.tech@dealpam.com' AND st.is_primary = true LIMIT 1;

  SELECT id INTO v_cat_id FROM categories WHERE slug = 'smartphones' LIMIT 1;

  IF v_store_id IS NOT NULL AND v_cat_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM products WHERE slug = 'samsung-galaxy-s24-ultra-512gb') THEN
      v_rating := 3.5 + random() * 1.5;
      INSERT INTO products (id, store_id, category_id, name, slug, description, price, sale_price, stock, status, avg_rating, total_reviews, view_count, is_featured, created_at, updated_at)
      VALUES (
        gen_random_uuid(), v_store_id, v_cat_id,
        'Samsung Galaxy S24 Ultra 512GB', 'samsung-galaxy-s24-ultra-512gb', 'Samsung Galaxy S24 Ultra 512GB, S-Pen, zoom 100x, 12GB RAM',
        72000, 65000, 12, 'PUBLISHED',
        ROUND(v_rating::numeric, 1),
        (floor(random() * 120) + 5)::int,
        (floor(random() * 800) + 20)::int,
        (random() > 0.75),
        NOW(), NOW()
      ) RETURNING id INTO v_prod_id;

      INSERT INTO product_images (id, product_id, url_full, url_medium, url_thumb, public_id, is_primary, sort_order, created_at, updated_at)
      VALUES (gen_random_uuid(), v_prod_id, 'https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?w=700&q=90', 'https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?w=700&q=90', 'https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?w=700&q=90', 'seed_samsung-galaxy-s24-ultra-512gb', true, 0, NOW(), NOW());
    END IF;
  END IF;
END $$;


-- Produit 3: Samsung Galaxy A54 128GB
DO $$
DECLARE
  v_store_id  UUID;
  v_cat_id    UUID;
  v_prod_id   UUID;
  v_rating    NUMERIC;
BEGIN
  SELECT st.id INTO v_store_id
  FROM stores st JOIN sellers s ON s.id = st.seller_id
  JOIN users u ON u.id = s.user_id WHERE u.email = 'rico.tech@dealpam.com' AND st.is_primary = true LIMIT 1;

  SELECT id INTO v_cat_id FROM categories WHERE slug = 'smartphones' LIMIT 1;

  IF v_store_id IS NOT NULL AND v_cat_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM products WHERE slug = 'samsung-galaxy-a54-128gb') THEN
      v_rating := 3.5 + random() * 1.5;
      INSERT INTO products (id, store_id, category_id, name, slug, description, price, sale_price, stock, status, avg_rating, total_reviews, view_count, is_featured, created_at, updated_at)
      VALUES (
        gen_random_uuid(), v_store_id, v_cat_id,
        'Samsung Galaxy A54 128GB', 'samsung-galaxy-a54-128gb', 'Samsung Galaxy A54, ecran 6.4 AMOLED, batterie 5000mAh',
        28000, 24500, 25, 'PUBLISHED',
        ROUND(v_rating::numeric, 1),
        (floor(random() * 120) + 5)::int,
        (floor(random() * 800) + 20)::int,
        (random() > 0.75),
        NOW(), NOW()
      ) RETURNING id INTO v_prod_id;

      INSERT INTO product_images (id, product_id, url_full, url_medium, url_thumb, public_id, is_primary, sort_order, created_at, updated_at)
      VALUES (gen_random_uuid(), v_prod_id, 'https://images.unsplash.com/photo-1610945264803-c22b62d2a7b3?w=700&q=90', 'https://images.unsplash.com/photo-1610945264803-c22b62d2a7b3?w=700&q=90', 'https://images.unsplash.com/photo-1610945264803-c22b62d2a7b3?w=700&q=90', 'seed_samsung-galaxy-a54-128gb', true, 0, NOW(), NOW());
    END IF;
  END IF;
END $$;


-- Produit 4: iPhone 14 128GB Noir
DO $$
DECLARE
  v_store_id  UUID;
  v_cat_id    UUID;
  v_prod_id   UUID;
  v_rating    NUMERIC;
BEGIN
  SELECT st.id INTO v_store_id
  FROM stores st JOIN sellers s ON s.id = st.seller_id
  JOIN users u ON u.id = s.user_id WHERE u.email = 'auto.plus@dealpam.com' AND st.is_primary = true LIMIT 1;

  SELECT id INTO v_cat_id FROM categories WHERE slug = 'smartphones' LIMIT 1;

  IF v_store_id IS NOT NULL AND v_cat_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM products WHERE slug = 'iphone-14-128gb-noir') THEN
      v_rating := 3.5 + random() * 1.5;
      INSERT INTO products (id, store_id, category_id, name, slug, description, price, sale_price, stock, status, avg_rating, total_reviews, view_count, is_featured, created_at, updated_at)
      VALUES (
        gen_random_uuid(), v_store_id, v_cat_id,
        'iPhone 14 128GB Noir', 'iphone-14-128gb-noir', 'iPhone 14 128GB noir minuit, Face ID, 5G',
        60000, 54000, 6, 'PUBLISHED',
        ROUND(v_rating::numeric, 1),
        (floor(random() * 120) + 5)::int,
        (floor(random() * 800) + 20)::int,
        (random() > 0.75),
        NOW(), NOW()
      ) RETURNING id INTO v_prod_id;

      INSERT INTO product_images (id, product_id, url_full, url_medium, url_thumb, public_id, is_primary, sort_order, created_at, updated_at)
      VALUES (gen_random_uuid(), v_prod_id, 'https://images.unsplash.com/photo-1664478546384-d57ffe74a78c?w=700&q=90', 'https://images.unsplash.com/photo-1664478546384-d57ffe74a78c?w=700&q=90', 'https://images.unsplash.com/photo-1664478546384-d57ffe74a78c?w=700&q=90', 'seed_iphone-14-128gb-noir', true, 0, NOW(), NOW());
    END IF;
  END IF;
END $$;


-- Produit 5: Tecno Spark 20 Pro 256GB
DO $$
DECLARE
  v_store_id  UUID;
  v_cat_id    UUID;
  v_prod_id   UUID;
  v_rating    NUMERIC;
BEGIN
  SELECT st.id INTO v_store_id
  FROM stores st JOIN sellers s ON s.id = st.seller_id
  JOIN users u ON u.id = s.user_id WHERE u.email = 'gonaives.market@dealpam.com' AND st.is_primary = true LIMIT 1;

  SELECT id INTO v_cat_id FROM categories WHERE slug = 'smartphones' LIMIT 1;

  IF v_store_id IS NOT NULL AND v_cat_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM products WHERE slug = 'tecno-spark-20-pro-256gb') THEN
      v_rating := 3.5 + random() * 1.5;
      INSERT INTO products (id, store_id, category_id, name, slug, description, price, sale_price, stock, status, avg_rating, total_reviews, view_count, is_featured, created_at, updated_at)
      VALUES (
        gen_random_uuid(), v_store_id, v_cat_id,
        'Tecno Spark 20 Pro 256GB', 'tecno-spark-20-pro-256gb', 'Tecno Spark 20 Pro 256GB, charge rapide 33W',
        18500, 15900, 30, 'PUBLISHED',
        ROUND(v_rating::numeric, 1),
        (floor(random() * 120) + 5)::int,
        (floor(random() * 800) + 20)::int,
        (random() > 0.75),
        NOW(), NOW()
      ) RETURNING id INTO v_prod_id;

      INSERT INTO product_images (id, product_id, url_full, url_medium, url_thumb, public_id, is_primary, sort_order, created_at, updated_at)
      VALUES (gen_random_uuid(), v_prod_id, 'https://images.unsplash.com/photo-1585060544812-6b45742d762f?w=700&q=90', 'https://images.unsplash.com/photo-1585060544812-6b45742d762f?w=700&q=90', 'https://images.unsplash.com/photo-1585060544812-6b45742d762f?w=700&q=90', 'seed_tecno-spark-20-pro-256gb', true, 0, NOW(), NOW());
    END IF;
  END IF;
END $$;


-- Produit 6: Infinix Hot 40 Pro 128GB
DO $$
DECLARE
  v_store_id  UUID;
  v_cat_id    UUID;
  v_prod_id   UUID;
  v_rating    NUMERIC;
BEGIN
  SELECT st.id INTO v_store_id
  FROM stores st JOIN sellers s ON s.id = st.seller_id
  JOIN users u ON u.id = s.user_id WHERE u.email = 'gonaives.market@dealpam.com' AND st.is_primary = true LIMIT 1;

  SELECT id INTO v_cat_id FROM categories WHERE slug = 'smartphones' LIMIT 1;

  IF v_store_id IS NOT NULL AND v_cat_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM products WHERE slug = 'infinix-hot-40-pro-128gb') THEN
      v_rating := 3.5 + random() * 1.5;
      INSERT INTO products (id, store_id, category_id, name, slug, description, price, sale_price, stock, status, avg_rating, total_reviews, view_count, is_featured, created_at, updated_at)
      VALUES (
        gen_random_uuid(), v_store_id, v_cat_id,
        'Infinix Hot 40 Pro 128GB', 'infinix-hot-40-pro-128gb', 'Infinix Hot 40 Pro 128GB, ecran 6.78 FHD+',
        12000, 10500, 40, 'PUBLISHED',
        ROUND(v_rating::numeric, 1),
        (floor(random() * 120) + 5)::int,
        (floor(random() * 800) + 20)::int,
        (random() > 0.75),
        NOW(), NOW()
      ) RETURNING id INTO v_prod_id;

      INSERT INTO product_images (id, product_id, url_full, url_medium, url_thumb, public_id, is_primary, sort_order, created_at, updated_at)
      VALUES (gen_random_uuid(), v_prod_id, 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=700&q=90', 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=700&q=90', 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=700&q=90', 'seed_infinix-hot-40-pro-128gb', true, 0, NOW(), NOW());
    END IF;
  END IF;
END $$;


-- Produit 7: Xiaomi Redmi Note 13 Pro
DO $$
DECLARE
  v_store_id  UUID;
  v_cat_id    UUID;
  v_prod_id   UUID;
  v_rating    NUMERIC;
BEGIN
  SELECT st.id INTO v_store_id
  FROM stores st JOIN sellers s ON s.id = st.seller_id
  JOIN users u ON u.id = s.user_id WHERE u.email = 'gonaives.market@dealpam.com' AND st.is_primary = true LIMIT 1;

  SELECT id INTO v_cat_id FROM categories WHERE slug = 'smartphones' LIMIT 1;

  IF v_store_id IS NOT NULL AND v_cat_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM products WHERE slug = 'xiaomi-redmi-note-13-pro') THEN
      v_rating := 3.5 + random() * 1.5;
      INSERT INTO products (id, store_id, category_id, name, slug, description, price, sale_price, stock, status, avg_rating, total_reviews, view_count, is_featured, created_at, updated_at)
      VALUES (
        gen_random_uuid(), v_store_id, v_cat_id,
        'Xiaomi Redmi Note 13 Pro', 'xiaomi-redmi-note-13-pro', 'Xiaomi Redmi Note 13 Pro, camera 200MP, AMOLED 120Hz',
        24000, 21000, 20, 'PUBLISHED',
        ROUND(v_rating::numeric, 1),
        (floor(random() * 120) + 5)::int,
        (floor(random() * 800) + 20)::int,
        (random() > 0.75),
        NOW(), NOW()
      ) RETURNING id INTO v_prod_id;

      INSERT INTO product_images (id, product_id, url_full, url_medium, url_thumb, public_id, is_primary, sort_order, created_at, updated_at)
      VALUES (gen_random_uuid(), v_prod_id, 'https://images.unsplash.com/photo-1601784551446-20c9e07cdbdb?w=700&q=90', 'https://images.unsplash.com/photo-1601784551446-20c9e07cdbdb?w=700&q=90', 'https://images.unsplash.com/photo-1601784551446-20c9e07cdbdb?w=700&q=90', 'seed_xiaomi-redmi-note-13-pro', true, 0, NOW(), NOW());
    END IF;
  END IF;
END $$;


-- Produit 8: Robe Soiree Longue Rouge
DO $$
DECLARE
  v_store_id  UUID;
  v_cat_id    UUID;
  v_prod_id   UUID;
  v_rating    NUMERIC;
BEGIN
  SELECT st.id INTO v_store_id
  FROM stores st JOIN sellers s ON s.id = st.seller_id
  JOIN users u ON u.id = s.user_id WHERE u.email = 'mode.chic@dealpam.com' AND st.is_primary = true LIMIT 1;

  SELECT id INTO v_cat_id FROM categories WHERE slug = 'vetements' LIMIT 1;

  IF v_store_id IS NOT NULL AND v_cat_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM products WHERE slug = 'robe-soiree-longue-rouge') THEN
      v_rating := 3.5 + random() * 1.5;
      INSERT INTO products (id, store_id, category_id, name, slug, description, price, sale_price, stock, status, avg_rating, total_reviews, view_count, is_featured, created_at, updated_at)
      VALUES (
        gen_random_uuid(), v_store_id, v_cat_id,
        'Robe Soiree Longue Rouge', 'robe-soiree-longue-rouge', 'Robe longue rouge, tissu satin, taille S/M/L/XL',
        8500, 6800, 15, 'PUBLISHED',
        ROUND(v_rating::numeric, 1),
        (floor(random() * 120) + 5)::int,
        (floor(random() * 800) + 20)::int,
        (random() > 0.75),
        NOW(), NOW()
      ) RETURNING id INTO v_prod_id;

      INSERT INTO product_images (id, product_id, url_full, url_medium, url_thumb, public_id, is_primary, sort_order, created_at, updated_at)
      VALUES (gen_random_uuid(), v_prod_id, 'https://images.unsplash.com/photo-1566479179817-c0e38fd5c97e?w=700&q=90', 'https://images.unsplash.com/photo-1566479179817-c0e38fd5c97e?w=700&q=90', 'https://images.unsplash.com/photo-1566479179817-c0e38fd5c97e?w=700&q=90', 'seed_robe-soiree-longue-rouge', true, 0, NOW(), NOW());
    END IF;
  END IF;
END $$;


-- Produit 9: Costume Homme 3 Pieces Bleu
DO $$
DECLARE
  v_store_id  UUID;
  v_cat_id    UUID;
  v_prod_id   UUID;
  v_rating    NUMERIC;
BEGIN
  SELECT st.id INTO v_store_id
  FROM stores st JOIN sellers s ON s.id = st.seller_id
  JOIN users u ON u.id = s.user_id WHERE u.email = 'mode.chic@dealpam.com' AND st.is_primary = true LIMIT 1;

  SELECT id INTO v_cat_id FROM categories WHERE slug = 'vetements' LIMIT 1;

  IF v_store_id IS NOT NULL AND v_cat_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM products WHERE slug = 'costume-homme-3p-bleu') THEN
      v_rating := 3.5 + random() * 1.5;
      INSERT INTO products (id, store_id, category_id, name, slug, description, price, sale_price, stock, status, avg_rating, total_reviews, view_count, is_featured, created_at, updated_at)
      VALUES (
        gen_random_uuid(), v_store_id, v_cat_id,
        'Costume Homme 3 Pieces Bleu', 'costume-homme-3p-bleu', 'Costume 3 pieces bleu marine, veste + pantalon + gilet',
        18500, 15000, 10, 'PUBLISHED',
        ROUND(v_rating::numeric, 1),
        (floor(random() * 120) + 5)::int,
        (floor(random() * 800) + 20)::int,
        (random() > 0.75),
        NOW(), NOW()
      ) RETURNING id INTO v_prod_id;

      INSERT INTO product_images (id, product_id, url_full, url_medium, url_thumb, public_id, is_primary, sort_order, created_at, updated_at)
      VALUES (gen_random_uuid(), v_prod_id, 'https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?w=700&q=90', 'https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?w=700&q=90', 'https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?w=700&q=90', 'seed_costume-homme-3p-bleu', true, 0, NOW(), NOW());
    END IF;
  END IF;
END $$;


-- Produit 10: Tailleur Femme Blanc Elegant
DO $$
DECLARE
  v_store_id  UUID;
  v_cat_id    UUID;
  v_prod_id   UUID;
  v_rating    NUMERIC;
BEGIN
  SELECT st.id INTO v_store_id
  FROM stores st JOIN sellers s ON s.id = st.seller_id
  JOIN users u ON u.id = s.user_id WHERE u.email = 'jacmel.boutique@dealpam.com' AND st.is_primary = true LIMIT 1;

  SELECT id INTO v_cat_id FROM categories WHERE slug = 'vetements' LIMIT 1;

  IF v_store_id IS NOT NULL AND v_cat_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM products WHERE slug = 'tailleur-femme-blanc') THEN
      v_rating := 3.5 + random() * 1.5;
      INSERT INTO products (id, store_id, category_id, name, slug, description, price, sale_price, stock, status, avg_rating, total_reviews, view_count, is_featured, created_at, updated_at)
      VALUES (
        gen_random_uuid(), v_store_id, v_cat_id,
        'Tailleur Femme Blanc Elegant', 'tailleur-femme-blanc', 'Tailleur pantalon femme blanc, veste + pantalon, taille 36-44',
        7200, 6000, 12, 'PUBLISHED',
        ROUND(v_rating::numeric, 1),
        (floor(random() * 120) + 5)::int,
        (floor(random() * 800) + 20)::int,
        (random() > 0.75),
        NOW(), NOW()
      ) RETURNING id INTO v_prod_id;

      INSERT INTO product_images (id, product_id, url_full, url_medium, url_thumb, public_id, is_primary, sort_order, created_at, updated_at)
      VALUES (gen_random_uuid(), v_prod_id, 'https://images.unsplash.com/photo-1583744946564-b52ac1c389c8?w=700&q=90', 'https://images.unsplash.com/photo-1583744946564-b52ac1c389c8?w=700&q=90', 'https://images.unsplash.com/photo-1583744946564-b52ac1c389c8?w=700&q=90', 'seed_tailleur-femme-blanc', true, 0, NOW(), NOW());
    END IF;
  END IF;
END $$;


-- Produit 11: T-Shirt Coton Premium Homme
DO $$
DECLARE
  v_store_id  UUID;
  v_cat_id    UUID;
  v_prod_id   UUID;
  v_rating    NUMERIC;
BEGIN
  SELECT st.id INTO v_store_id
  FROM stores st JOIN sellers s ON s.id = st.seller_id
  JOIN users u ON u.id = s.user_id WHERE u.email = 'gonaives.market@dealpam.com' AND st.is_primary = true LIMIT 1;

  SELECT id INTO v_cat_id FROM categories WHERE slug = 'vetements' LIMIT 1;

  IF v_store_id IS NOT NULL AND v_cat_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM products WHERE slug = 't-shirt-coton-premium') THEN
      v_rating := 3.5 + random() * 1.5;
      INSERT INTO products (id, store_id, category_id, name, slug, description, price, sale_price, stock, status, avg_rating, total_reviews, view_count, is_featured, created_at, updated_at)
      VALUES (
        gen_random_uuid(), v_store_id, v_cat_id,
        'T-Shirt Coton Premium Homme', 't-shirt-coton-premium', 'T-shirt col rond 100% coton, 8 couleurs, S au XXL',
        1800, 1400, 60, 'PUBLISHED',
        ROUND(v_rating::numeric, 1),
        (floor(random() * 120) + 5)::int,
        (floor(random() * 800) + 20)::int,
        (random() > 0.75),
        NOW(), NOW()
      ) RETURNING id INTO v_prod_id;

      INSERT INTO product_images (id, product_id, url_full, url_medium, url_thumb, public_id, is_primary, sort_order, created_at, updated_at)
      VALUES (gen_random_uuid(), v_prod_id, 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=700&q=90', 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=700&q=90', 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=700&q=90', 'seed_t-shirt-coton-premium', true, 0, NOW(), NOW());
    END IF;
  END IF;
END $$;


-- Produit 12: Jean Slim Fit Bleu Fonce
DO $$
DECLARE
  v_store_id  UUID;
  v_cat_id    UUID;
  v_prod_id   UUID;
  v_rating    NUMERIC;
BEGIN
  SELECT st.id INTO v_store_id
  FROM stores st JOIN sellers s ON s.id = st.seller_id
  JOIN users u ON u.id = s.user_id WHERE u.email = 'mode.chic@dealpam.com' AND st.is_primary = true LIMIT 1;

  SELECT id INTO v_cat_id FROM categories WHERE slug = 'vetements' LIMIT 1;

  IF v_store_id IS NOT NULL AND v_cat_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM products WHERE slug = 'jean-slim-fit-bleu') THEN
      v_rating := 3.5 + random() * 1.5;
      INSERT INTO products (id, store_id, category_id, name, slug, description, price, sale_price, stock, status, avg_rating, total_reviews, view_count, is_featured, created_at, updated_at)
      VALUES (
        gen_random_uuid(), v_store_id, v_cat_id,
        'Jean Slim Fit Bleu Fonce', 'jean-slim-fit-bleu', 'Jean slim fit stretch bleu fonce, taille 28-40',
        3500, 2900, 35, 'PUBLISHED',
        ROUND(v_rating::numeric, 1),
        (floor(random() * 120) + 5)::int,
        (floor(random() * 800) + 20)::int,
        (random() > 0.75),
        NOW(), NOW()
      ) RETURNING id INTO v_prod_id;

      INSERT INTO product_images (id, product_id, url_full, url_medium, url_thumb, public_id, is_primary, sort_order, created_at, updated_at)
      VALUES (gen_random_uuid(), v_prod_id, 'https://images.unsplash.com/photo-1542272604-787c3835535d?w=700&q=90', 'https://images.unsplash.com/photo-1542272604-787c3835535d?w=700&q=90', 'https://images.unsplash.com/photo-1542272604-787c3835535d?w=700&q=90', 'seed_jean-slim-fit-bleu', true, 0, NOW(), NOW());
    END IF;
  END IF;
END $$;


-- Produit 13: Chemise Homme Lin Blanc
DO $$
DECLARE
  v_store_id  UUID;
  v_cat_id    UUID;
  v_prod_id   UUID;
  v_rating    NUMERIC;
BEGIN
  SELECT st.id INTO v_store_id
  FROM stores st JOIN sellers s ON s.id = st.seller_id
  JOIN users u ON u.id = s.user_id WHERE u.email = 'jacmel.boutique@dealpam.com' AND st.is_primary = true LIMIT 1;

  SELECT id INTO v_cat_id FROM categories WHERE slug = 'vetements' LIMIT 1;

  IF v_store_id IS NOT NULL AND v_cat_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM products WHERE slug = 'chemise-homme-lin-blanc') THEN
      v_rating := 3.5 + random() * 1.5;
      INSERT INTO products (id, store_id, category_id, name, slug, description, price, sale_price, stock, status, avg_rating, total_reviews, view_count, is_featured, created_at, updated_at)
      VALUES (
        gen_random_uuid(), v_store_id, v_cat_id,
        'Chemise Homme Lin Blanc', 'chemise-homme-lin-blanc', 'Chemise lin blanc, legere et respirante, S a XXL',
        2800, NULL, 25, 'PUBLISHED',
        ROUND(v_rating::numeric, 1),
        (floor(random() * 120) + 5)::int,
        (floor(random() * 800) + 20)::int,
        (random() > 0.75),
        NOW(), NOW()
      ) RETURNING id INTO v_prod_id;

      INSERT INTO product_images (id, product_id, url_full, url_medium, url_thumb, public_id, is_primary, sort_order, created_at, updated_at)
      VALUES (gen_random_uuid(), v_prod_id, 'https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?w=700&q=90', 'https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?w=700&q=90', 'https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?w=700&q=90', 'seed_chemise-homme-lin-blanc', true, 0, NOW(), NOW());
    END IF;
  END IF;
END $$;


-- Produit 14: Robe Wax Africaine Coloree
DO $$
DECLARE
  v_store_id  UUID;
  v_cat_id    UUID;
  v_prod_id   UUID;
  v_rating    NUMERIC;
BEGIN
  SELECT st.id INTO v_store_id
  FROM stores st JOIN sellers s ON s.id = st.seller_id
  JOIN users u ON u.id = s.user_id WHERE u.email = 'mode.chic@dealpam.com' AND st.is_primary = true LIMIT 1;

  SELECT id INTO v_cat_id FROM categories WHERE slug = 'vetements' LIMIT 1;

  IF v_store_id IS NOT NULL AND v_cat_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM products WHERE slug = 'robe-wax-africaine') THEN
      v_rating := 3.5 + random() * 1.5;
      INSERT INTO products (id, store_id, category_id, name, slug, description, price, sale_price, stock, status, avg_rating, total_reviews, view_count, is_featured, created_at, updated_at)
      VALUES (
        gen_random_uuid(), v_store_id, v_cat_id,
        'Robe Wax Africaine Coloree', 'robe-wax-africaine', 'Robe wax africaine, tissu coton imprime, taille unique ajustable',
        4500, 3800, 20, 'PUBLISHED',
        ROUND(v_rating::numeric, 1),
        (floor(random() * 120) + 5)::int,
        (floor(random() * 800) + 20)::int,
        (random() > 0.75),
        NOW(), NOW()
      ) RETURNING id INTO v_prod_id;

      INSERT INTO product_images (id, product_id, url_full, url_medium, url_thumb, public_id, is_primary, sort_order, created_at, updated_at)
      VALUES (gen_random_uuid(), v_prod_id, 'https://images.unsplash.com/photo-1614179689702-355944cd0918?w=700&q=90', 'https://images.unsplash.com/photo-1614179689702-355944cd0918?w=700&q=90', 'https://images.unsplash.com/photo-1614179689702-355944cd0918?w=700&q=90', 'seed_robe-wax-africaine', true, 0, NOW(), NOW());
    END IF;
  END IF;
END $$;


-- Produit 15: Toyota Corolla 2020 Auto
DO $$
DECLARE
  v_store_id  UUID;
  v_cat_id    UUID;
  v_prod_id   UUID;
  v_rating    NUMERIC;
BEGIN
  SELECT st.id INTO v_store_id
  FROM stores st JOIN sellers s ON s.id = st.seller_id
  JOIN users u ON u.id = s.user_id WHERE u.email = 'auto.plus@dealpam.com' AND st.is_primary = true LIMIT 1;

  SELECT id INTO v_cat_id FROM categories WHERE slug = 'vehicules' LIMIT 1;

  IF v_store_id IS NOT NULL AND v_cat_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM products WHERE slug = 'toyota-corolla-2020-auto') THEN
      v_rating := 3.5 + random() * 1.5;
      INSERT INTO products (id, store_id, category_id, name, slug, description, price, sale_price, stock, status, avg_rating, total_reviews, view_count, is_featured, created_at, updated_at)
      VALUES (
        gen_random_uuid(), v_store_id, v_cat_id,
        'Toyota Corolla 2020 Auto', 'toyota-corolla-2020-auto', 'Toyota Corolla 2020, auto, 50000km, climatisation',
        1800000, 1650000, 2, 'PUBLISHED',
        ROUND(v_rating::numeric, 1),
        (floor(random() * 120) + 5)::int,
        (floor(random() * 800) + 20)::int,
        (random() > 0.75),
        NOW(), NOW()
      ) RETURNING id INTO v_prod_id;

      INSERT INTO product_images (id, product_id, url_full, url_medium, url_thumb, public_id, is_primary, sort_order, created_at, updated_at)
      VALUES (gen_random_uuid(), v_prod_id, 'https://images.unsplash.com/photo-1621007947382-bb3c3994e3fb?w=700&q=90', 'https://images.unsplash.com/photo-1621007947382-bb3c3994e3fb?w=700&q=90', 'https://images.unsplash.com/photo-1621007947382-bb3c3994e3fb?w=700&q=90', 'seed_toyota-corolla-2020-auto', true, 0, NOW(), NOW());
    END IF;
  END IF;
END $$;


-- Produit 16: Honda CR-V 2019 4x4
DO $$
DECLARE
  v_store_id  UUID;
  v_cat_id    UUID;
  v_prod_id   UUID;
  v_rating    NUMERIC;
BEGIN
  SELECT st.id INTO v_store_id
  FROM stores st JOIN sellers s ON s.id = st.seller_id
  JOIN users u ON u.id = s.user_id WHERE u.email = 'auto.plus@dealpam.com' AND st.is_primary = true LIMIT 1;

  SELECT id INTO v_cat_id FROM categories WHERE slug = 'vehicules' LIMIT 1;

  IF v_store_id IS NOT NULL AND v_cat_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM products WHERE slug = 'honda-crv-2019-4x4') THEN
      v_rating := 3.5 + random() * 1.5;
      INSERT INTO products (id, store_id, category_id, name, slug, description, price, sale_price, stock, status, avg_rating, total_reviews, view_count, is_featured, created_at, updated_at)
      VALUES (
        gen_random_uuid(), v_store_id, v_cat_id,
        'Honda CR-V 2019 4x4', 'honda-crv-2019-4x4', 'Honda CR-V 2019 4x4, 68000km, toit ouvrant',
        2200000, 1980000, 1, 'PUBLISHED',
        ROUND(v_rating::numeric, 1),
        (floor(random() * 120) + 5)::int,
        (floor(random() * 800) + 20)::int,
        (random() > 0.75),
        NOW(), NOW()
      ) RETURNING id INTO v_prod_id;

      INSERT INTO product_images (id, product_id, url_full, url_medium, url_thumb, public_id, is_primary, sort_order, created_at, updated_at)
      VALUES (gen_random_uuid(), v_prod_id, 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=700&q=90', 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=700&q=90', 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=700&q=90', 'seed_honda-crv-2019-4x4', true, 0, NOW(), NOW());
    END IF;
  END IF;
END $$;


-- Produit 17: Moto Yamaha YBR 125cc
DO $$
DECLARE
  v_store_id  UUID;
  v_cat_id    UUID;
  v_prod_id   UUID;
  v_rating    NUMERIC;
BEGIN
  SELECT st.id INTO v_store_id
  FROM stores st JOIN sellers s ON s.id = st.seller_id
  JOIN users u ON u.id = s.user_id WHERE u.email = 'cayes.shop@dealpam.com' AND st.is_primary = true LIMIT 1;

  SELECT id INTO v_cat_id FROM categories WHERE slug = 'vehicules' LIMIT 1;

  IF v_store_id IS NOT NULL AND v_cat_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM products WHERE slug = 'moto-yamaha-ybr-125cc') THEN
      v_rating := 3.5 + random() * 1.5;
      INSERT INTO products (id, store_id, category_id, name, slug, description, price, sale_price, stock, status, avg_rating, total_reviews, view_count, is_featured, created_at, updated_at)
      VALUES (
        gen_random_uuid(), v_store_id, v_cat_id,
        'Moto Yamaha YBR 125cc', 'moto-yamaha-ybr-125cc', 'Yamaha YBR 125cc noire, economique, parfaite pour la ville',
        185000, 165000, 4, 'PUBLISHED',
        ROUND(v_rating::numeric, 1),
        (floor(random() * 120) + 5)::int,
        (floor(random() * 800) + 20)::int,
        (random() > 0.75),
        NOW(), NOW()
      ) RETURNING id INTO v_prod_id;

      INSERT INTO product_images (id, product_id, url_full, url_medium, url_thumb, public_id, is_primary, sort_order, created_at, updated_at)
      VALUES (gen_random_uuid(), v_prod_id, 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=700&q=90', 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=700&q=90', 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=700&q=90', 'seed_moto-yamaha-ybr-125cc', true, 0, NOW(), NOW());
    END IF;
  END IF;
END $$;


-- Produit 18: Hyundai Tucson 2021 Full
DO $$
DECLARE
  v_store_id  UUID;
  v_cat_id    UUID;
  v_prod_id   UUID;
  v_rating    NUMERIC;
BEGIN
  SELECT st.id INTO v_store_id
  FROM stores st JOIN sellers s ON s.id = st.seller_id
  JOIN users u ON u.id = s.user_id WHERE u.email = 'auto.plus@dealpam.com' AND st.is_primary = true LIMIT 1;

  SELECT id INTO v_cat_id FROM categories WHERE slug = 'vehicules' LIMIT 1;

  IF v_store_id IS NOT NULL AND v_cat_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM products WHERE slug = 'hyundai-tucson-2021') THEN
      v_rating := 3.5 + random() * 1.5;
      INSERT INTO products (id, store_id, category_id, name, slug, description, price, sale_price, stock, status, avg_rating, total_reviews, view_count, is_featured, created_at, updated_at)
      VALUES (
        gen_random_uuid(), v_store_id, v_cat_id,
        'Hyundai Tucson 2021 Full', 'hyundai-tucson-2021', 'Hyundai Tucson 2021, diesel, 35000km, carplay',
        2800000, 2500000, 1, 'PUBLISHED',
        ROUND(v_rating::numeric, 1),
        (floor(random() * 120) + 5)::int,
        (floor(random() * 800) + 20)::int,
        (random() > 0.75),
        NOW(), NOW()
      ) RETURNING id INTO v_prod_id;

      INSERT INTO product_images (id, product_id, url_full, url_medium, url_thumb, public_id, is_primary, sort_order, created_at, updated_at)
      VALUES (gen_random_uuid(), v_prod_id, 'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=700&q=90', 'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=700&q=90', 'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=700&q=90', 'seed_hyundai-tucson-2021', true, 0, NOW(), NOW());
    END IF;
  END IF;
END $$;


-- Produit 19: Toyota Hilux 2018 4x4
DO $$
DECLARE
  v_store_id  UUID;
  v_cat_id    UUID;
  v_prod_id   UUID;
  v_rating    NUMERIC;
BEGIN
  SELECT st.id INTO v_store_id
  FROM stores st JOIN sellers s ON s.id = st.seller_id
  JOIN users u ON u.id = s.user_id WHERE u.email = 'auto.plus@dealpam.com' AND st.is_primary = true LIMIT 1;

  SELECT id INTO v_cat_id FROM categories WHERE slug = 'vehicules' LIMIT 1;

  IF v_store_id IS NOT NULL AND v_cat_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM products WHERE slug = 'toyota-hilux-2018-4x4') THEN
      v_rating := 3.5 + random() * 1.5;
      INSERT INTO products (id, store_id, category_id, name, slug, description, price, sale_price, stock, status, avg_rating, total_reviews, view_count, is_featured, created_at, updated_at)
      VALUES (
        gen_random_uuid(), v_store_id, v_cat_id,
        'Toyota Hilux 2018 4x4', 'toyota-hilux-2018-4x4', 'Toyota Hilux 2018 diesel 4x4, 80000km, double cabine',
        3200000, 2900000, 1, 'PUBLISHED',
        ROUND(v_rating::numeric, 1),
        (floor(random() * 120) + 5)::int,
        (floor(random() * 800) + 20)::int,
        (random() > 0.75),
        NOW(), NOW()
      ) RETURNING id INTO v_prod_id;

      INSERT INTO product_images (id, product_id, url_full, url_medium, url_thumb, public_id, is_primary, sort_order, created_at, updated_at)
      VALUES (gen_random_uuid(), v_prod_id, 'https://images.unsplash.com/photo-1533591380348-14193f1de18f?w=700&q=90', 'https://images.unsplash.com/photo-1533591380348-14193f1de18f?w=700&q=90', 'https://images.unsplash.com/photo-1533591380348-14193f1de18f?w=700&q=90', 'seed_toyota-hilux-2018-4x4', true, 0, NOW(), NOW());
    END IF;
  END IF;
END $$;


-- Produit 20: Moto Bajaj Discover 125
DO $$
DECLARE
  v_store_id  UUID;
  v_cat_id    UUID;
  v_prod_id   UUID;
  v_rating    NUMERIC;
BEGIN
  SELECT st.id INTO v_store_id
  FROM stores st JOIN sellers s ON s.id = st.seller_id
  JOIN users u ON u.id = s.user_id WHERE u.email = 'cayes.shop@dealpam.com' AND st.is_primary = true LIMIT 1;

  SELECT id INTO v_cat_id FROM categories WHERE slug = 'vehicules' LIMIT 1;

  IF v_store_id IS NOT NULL AND v_cat_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM products WHERE slug = 'moto-bajaj-discover-125') THEN
      v_rating := 3.5 + random() * 1.5;
      INSERT INTO products (id, store_id, category_id, name, slug, description, price, sale_price, stock, status, avg_rating, total_reviews, view_count, is_featured, created_at, updated_at)
      VALUES (
        gen_random_uuid(), v_store_id, v_cat_id,
        'Moto Bajaj Discover 125', 'moto-bajaj-discover-125', 'Bajaj Discover 125cc, fiable, consomme peu, garantie 1 an',
        95000, 85000, 6, 'PUBLISHED',
        ROUND(v_rating::numeric, 1),
        (floor(random() * 120) + 5)::int,
        (floor(random() * 800) + 20)::int,
        (random() > 0.75),
        NOW(), NOW()
      ) RETURNING id INTO v_prod_id;

      INSERT INTO product_images (id, product_id, url_full, url_medium, url_thumb, public_id, is_primary, sort_order, created_at, updated_at)
      VALUES (gen_random_uuid(), v_prod_id, 'https://images.unsplash.com/photo-1568772585407-9361f9bf3a87?w=700&q=90', 'https://images.unsplash.com/photo-1568772585407-9361f9bf3a87?w=700&q=90', 'https://images.unsplash.com/photo-1568772585407-9361f9bf3a87?w=700&q=90', 'seed_moto-bajaj-discover-125', true, 0, NOW(), NOW());
    END IF;
  END IF;
END $$;


-- Produit 21: MacBook Air M2 256GB
DO $$
DECLARE
  v_store_id  UUID;
  v_cat_id    UUID;
  v_prod_id   UUID;
  v_rating    NUMERIC;
BEGIN
  SELECT st.id INTO v_store_id
  FROM stores st JOIN sellers s ON s.id = st.seller_id
  JOIN users u ON u.id = s.user_id WHERE u.email = 'rico.tech@dealpam.com' AND st.is_primary = true LIMIT 1;

  SELECT id INTO v_cat_id FROM categories WHERE slug = 'electronique' LIMIT 1;

  IF v_store_id IS NOT NULL AND v_cat_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM products WHERE slug = 'macbook-air-m2-256gb') THEN
      v_rating := 3.5 + random() * 1.5;
      INSERT INTO products (id, store_id, category_id, name, slug, description, price, sale_price, stock, status, avg_rating, total_reviews, view_count, is_featured, created_at, updated_at)
      VALUES (
        gen_random_uuid(), v_store_id, v_cat_id,
        'MacBook Air M2 256GB', 'macbook-air-m2-256gb', 'MacBook Air M2, 8GB RAM, 256GB SSD, 18h autonomie',
        125000, 115000, 5, 'PUBLISHED',
        ROUND(v_rating::numeric, 1),
        (floor(random() * 120) + 5)::int,
        (floor(random() * 800) + 20)::int,
        (random() > 0.75),
        NOW(), NOW()
      ) RETURNING id INTO v_prod_id;

      INSERT INTO product_images (id, product_id, url_full, url_medium, url_thumb, public_id, is_primary, sort_order, created_at, updated_at)
      VALUES (gen_random_uuid(), v_prod_id, 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=700&q=90', 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=700&q=90', 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=700&q=90', 'seed_macbook-air-m2-256gb', true, 0, NOW(), NOW());
    END IF;
  END IF;
END $$;


-- Produit 22: Ecran Samsung 27 4K 144Hz
DO $$
DECLARE
  v_store_id  UUID;
  v_cat_id    UUID;
  v_prod_id   UUID;
  v_rating    NUMERIC;
BEGIN
  SELECT st.id INTO v_store_id
  FROM stores st JOIN sellers s ON s.id = st.seller_id
  JOIN users u ON u.id = s.user_id WHERE u.email = 'rico.tech@dealpam.com' AND st.is_primary = true LIMIT 1;

  SELECT id INTO v_cat_id FROM categories WHERE slug = 'electronique' LIMIT 1;

  IF v_store_id IS NOT NULL AND v_cat_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM products WHERE slug = 'ecran-samsung-27-4k') THEN
      v_rating := 3.5 + random() * 1.5;
      INSERT INTO products (id, store_id, category_id, name, slug, description, price, sale_price, stock, status, avg_rating, total_reviews, view_count, is_featured, created_at, updated_at)
      VALUES (
        gen_random_uuid(), v_store_id, v_cat_id,
        'Ecran Samsung 27 4K 144Hz', 'ecran-samsung-27-4k', 'Samsung 27 pouces 4K UHD 144Hz, IPS, HDMI + DP',
        22000, 19500, 10, 'PUBLISHED',
        ROUND(v_rating::numeric, 1),
        (floor(random() * 120) + 5)::int,
        (floor(random() * 800) + 20)::int,
        (random() > 0.75),
        NOW(), NOW()
      ) RETURNING id INTO v_prod_id;

      INSERT INTO product_images (id, product_id, url_full, url_medium, url_thumb, public_id, is_primary, sort_order, created_at, updated_at)
      VALUES (gen_random_uuid(), v_prod_id, 'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=700&q=90', 'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=700&q=90', 'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=700&q=90', 'seed_ecran-samsung-27-4k', true, 0, NOW(), NOW());
    END IF;
  END IF;
END $$;


-- Produit 23: TV Samsung 55 QLED 4K
DO $$
DECLARE
  v_store_id  UUID;
  v_cat_id    UUID;
  v_prod_id   UUID;
  v_rating    NUMERIC;
BEGIN
  SELECT st.id INTO v_store_id
  FROM stores st JOIN sellers s ON s.id = st.seller_id
  JOIN users u ON u.id = s.user_id WHERE u.email = 'auto.plus@dealpam.com' AND st.is_primary = true LIMIT 1;

  SELECT id INTO v_cat_id FROM categories WHERE slug = 'electronique' LIMIT 1;

  IF v_store_id IS NOT NULL AND v_cat_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM products WHERE slug = 'tv-samsung-55-qled') THEN
      v_rating := 3.5 + random() * 1.5;
      INSERT INTO products (id, store_id, category_id, name, slug, description, price, sale_price, stock, status, avg_rating, total_reviews, view_count, is_featured, created_at, updated_at)
      VALUES (
        gen_random_uuid(), v_store_id, v_cat_id,
        'TV Samsung 55 QLED 4K', 'tv-samsung-55-qled', 'Samsung 55 pouces QLED 4K Smart, Netflix YouTube',
        45000, 38000, 6, 'PUBLISHED',
        ROUND(v_rating::numeric, 1),
        (floor(random() * 120) + 5)::int,
        (floor(random() * 800) + 20)::int,
        (random() > 0.75),
        NOW(), NOW()
      ) RETURNING id INTO v_prod_id;

      INSERT INTO product_images (id, product_id, url_full, url_medium, url_thumb, public_id, is_primary, sort_order, created_at, updated_at)
      VALUES (gen_random_uuid(), v_prod_id, 'https://images.unsplash.com/photo-1593359677879-a4bb92f4834c?w=700&q=90', 'https://images.unsplash.com/photo-1593359677879-a4bb92f4834c?w=700&q=90', 'https://images.unsplash.com/photo-1593359677879-a4bb92f4834c?w=700&q=90', 'seed_tv-samsung-55-qled', true, 0, NOW(), NOW());
    END IF;
  END IF;
END $$;


-- Produit 24: Casque Sony WH-1000XM5
DO $$
DECLARE
  v_store_id  UUID;
  v_cat_id    UUID;
  v_prod_id   UUID;
  v_rating    NUMERIC;
BEGIN
  SELECT st.id INTO v_store_id
  FROM stores st JOIN sellers s ON s.id = st.seller_id
  JOIN users u ON u.id = s.user_id WHERE u.email = 'gonaives.market@dealpam.com' AND st.is_primary = true LIMIT 1;

  SELECT id INTO v_cat_id FROM categories WHERE slug = 'electronique' LIMIT 1;

  IF v_store_id IS NOT NULL AND v_cat_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM products WHERE slug = 'casque-sony-wh1000xm5') THEN
      v_rating := 3.5 + random() * 1.5;
      INSERT INTO products (id, store_id, category_id, name, slug, description, price, sale_price, stock, status, avg_rating, total_reviews, view_count, is_featured, created_at, updated_at)
      VALUES (
        gen_random_uuid(), v_store_id, v_cat_id,
        'Casque Sony WH-1000XM5', 'casque-sony-wh1000xm5', 'Sony WH-1000XM5, ANC, 30h autonomie, Bluetooth 5.2',
        28000, 24000, 12, 'PUBLISHED',
        ROUND(v_rating::numeric, 1),
        (floor(random() * 120) + 5)::int,
        (floor(random() * 800) + 20)::int,
        (random() > 0.75),
        NOW(), NOW()
      ) RETURNING id INTO v_prod_id;

      INSERT INTO product_images (id, product_id, url_full, url_medium, url_thumb, public_id, is_primary, sort_order, created_at, updated_at)
      VALUES (gen_random_uuid(), v_prod_id, 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=700&q=90', 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=700&q=90', 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=700&q=90', 'seed_casque-sony-wh1000xm5', true, 0, NOW(), NOW());
    END IF;
  END IF;
END $$;


-- Produit 25: iPad Air 5 64GB WiFi
DO $$
DECLARE
  v_store_id  UUID;
  v_cat_id    UUID;
  v_prod_id   UUID;
  v_rating    NUMERIC;
BEGIN
  SELECT st.id INTO v_store_id
  FROM stores st JOIN sellers s ON s.id = st.seller_id
  JOIN users u ON u.id = s.user_id WHERE u.email = 'rico.tech@dealpam.com' AND st.is_primary = true LIMIT 1;

  SELECT id INTO v_cat_id FROM categories WHERE slug = 'electronique' LIMIT 1;

  IF v_store_id IS NOT NULL AND v_cat_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM products WHERE slug = 'ipad-air-5-64gb') THEN
      v_rating := 3.5 + random() * 1.5;
      INSERT INTO products (id, store_id, category_id, name, slug, description, price, sale_price, stock, status, avg_rating, total_reviews, view_count, is_featured, created_at, updated_at)
      VALUES (
        gen_random_uuid(), v_store_id, v_cat_id,
        'iPad Air 5 64GB WiFi', 'ipad-air-5-64gb', 'iPad Air M1, ecran 10.9 Liquid Retina, USB-C',
        55000, 49000, 7, 'PUBLISHED',
        ROUND(v_rating::numeric, 1),
        (floor(random() * 120) + 5)::int,
        (floor(random() * 800) + 20)::int,
        (random() > 0.75),
        NOW(), NOW()
      ) RETURNING id INTO v_prod_id;

      INSERT INTO product_images (id, product_id, url_full, url_medium, url_thumb, public_id, is_primary, sort_order, created_at, updated_at)
      VALUES (gen_random_uuid(), v_prod_id, 'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=700&q=90', 'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=700&q=90', 'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=700&q=90', 'seed_ipad-air-5-64gb', true, 0, NOW(), NOW());
    END IF;
  END IF;
END $$;


-- Produit 26: AirPods Pro 2eme Gen
DO $$
DECLARE
  v_store_id  UUID;
  v_cat_id    UUID;
  v_prod_id   UUID;
  v_rating    NUMERIC;
BEGIN
  SELECT st.id INTO v_store_id
  FROM stores st JOIN sellers s ON s.id = st.seller_id
  JOIN users u ON u.id = s.user_id WHERE u.email = 'rico.tech@dealpam.com' AND st.is_primary = true LIMIT 1;

  SELECT id INTO v_cat_id FROM categories WHERE slug = 'electronique' LIMIT 1;

  IF v_store_id IS NOT NULL AND v_cat_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM products WHERE slug = 'airpods-pro-2') THEN
      v_rating := 3.5 + random() * 1.5;
      INSERT INTO products (id, store_id, category_id, name, slug, description, price, sale_price, stock, status, avg_rating, total_reviews, view_count, is_featured, created_at, updated_at)
      VALUES (
        gen_random_uuid(), v_store_id, v_cat_id,
        'AirPods Pro 2eme Gen', 'airpods-pro-2', 'AirPods Pro 2e gen, ANC adaptatif, USB-C, boitier MagSafe',
        32000, 28000, 15, 'PUBLISHED',
        ROUND(v_rating::numeric, 1),
        (floor(random() * 120) + 5)::int,
        (floor(random() * 800) + 20)::int,
        (random() > 0.75),
        NOW(), NOW()
      ) RETURNING id INTO v_prod_id;

      INSERT INTO product_images (id, product_id, url_full, url_medium, url_thumb, public_id, is_primary, sort_order, created_at, updated_at)
      VALUES (gen_random_uuid(), v_prod_id, 'https://images.unsplash.com/photo-1600294037681-c80b4cb5b434?w=700&q=90', 'https://images.unsplash.com/photo-1600294037681-c80b4cb5b434?w=700&q=90', 'https://images.unsplash.com/photo-1600294037681-c80b4cb5b434?w=700&q=90', 'seed_airpods-pro-2', true, 0, NOW(), NOW());
    END IF;
  END IF;
END $$;


-- Produit 27: Canape 3 Places Velours Gris
DO $$
DECLARE
  v_store_id  UUID;
  v_cat_id    UUID;
  v_prod_id   UUID;
  v_rating    NUMERIC;
BEGIN
  SELECT st.id INTO v_store_id
  FROM stores st JOIN sellers s ON s.id = st.seller_id
  JOIN users u ON u.id = s.user_id WHERE u.email = 'cayes.shop@dealpam.com' AND st.is_primary = true LIMIT 1;

  SELECT id INTO v_cat_id FROM categories WHERE slug = 'meubles' LIMIT 1;

  IF v_store_id IS NOT NULL AND v_cat_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM products WHERE slug = 'canape-3p-velours-gris') THEN
      v_rating := 3.5 + random() * 1.5;
      INSERT INTO products (id, store_id, category_id, name, slug, description, price, sale_price, stock, status, avg_rating, total_reviews, view_count, is_featured, created_at, updated_at)
      VALUES (
        gen_random_uuid(), v_store_id, v_cat_id,
        'Canape 3 Places Velours Gris', 'canape-3p-velours-gris', 'Canape velours gris, pieds metal dore, tres confortable',
        28000, 24000, 5, 'PUBLISHED',
        ROUND(v_rating::numeric, 1),
        (floor(random() * 120) + 5)::int,
        (floor(random() * 800) + 20)::int,
        (random() > 0.75),
        NOW(), NOW()
      ) RETURNING id INTO v_prod_id;

      INSERT INTO product_images (id, product_id, url_full, url_medium, url_thumb, public_id, is_primary, sort_order, created_at, updated_at)
      VALUES (gen_random_uuid(), v_prod_id, 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=700&q=90', 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=700&q=90', 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=700&q=90', 'seed_canape-3p-velours-gris', true, 0, NOW(), NOW());
    END IF;
  END IF;
END $$;


-- Produit 28: Lit Double 160x200 Bois Massif
DO $$
DECLARE
  v_store_id  UUID;
  v_cat_id    UUID;
  v_prod_id   UUID;
  v_rating    NUMERIC;
BEGIN
  SELECT st.id INTO v_store_id
  FROM stores st JOIN sellers s ON s.id = st.seller_id
  JOIN users u ON u.id = s.user_id WHERE u.email = 'cayes.shop@dealpam.com' AND st.is_primary = true LIMIT 1;

  SELECT id INTO v_cat_id FROM categories WHERE slug = 'meubles' LIMIT 1;

  IF v_store_id IS NOT NULL AND v_cat_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM products WHERE slug = 'lit-double-160x200') THEN
      v_rating := 3.5 + random() * 1.5;
      INSERT INTO products (id, store_id, category_id, name, slug, description, price, sale_price, stock, status, avg_rating, total_reviews, view_count, is_featured, created_at, updated_at)
      VALUES (
        gen_random_uuid(), v_store_id, v_cat_id,
        'Lit Double 160x200 Bois Massif', 'lit-double-160x200', 'Lit double 160x200 bois massif + sommier a lattes',
        35000, NULL, 4, 'PUBLISHED',
        ROUND(v_rating::numeric, 1),
        (floor(random() * 120) + 5)::int,
        (floor(random() * 800) + 20)::int,
        (random() > 0.75),
        NOW(), NOW()
      ) RETURNING id INTO v_prod_id;

      INSERT INTO product_images (id, product_id, url_full, url_medium, url_thumb, public_id, is_primary, sort_order, created_at, updated_at)
      VALUES (gen_random_uuid(), v_prod_id, 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=700&q=90', 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=700&q=90', 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=700&q=90', 'seed_lit-double-160x200', true, 0, NOW(), NOW());
    END IF;
  END IF;
END $$;


-- Produit 29: Table Manger 6 Personnes
DO $$
DECLARE
  v_store_id  UUID;
  v_cat_id    UUID;
  v_prod_id   UUID;
  v_rating    NUMERIC;
BEGIN
  SELECT st.id INTO v_store_id
  FROM stores st JOIN sellers s ON s.id = st.seller_id
  JOIN users u ON u.id = s.user_id WHERE u.email = 'cayes.shop@dealpam.com' AND st.is_primary = true LIMIT 1;

  SELECT id INTO v_cat_id FROM categories WHERE slug = 'meubles' LIMIT 1;

  IF v_store_id IS NOT NULL AND v_cat_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM products WHERE slug = 'table-manger-6p') THEN
      v_rating := 3.5 + random() * 1.5;
      INSERT INTO products (id, store_id, category_id, name, slug, description, price, sale_price, stock, status, avg_rating, total_reviews, view_count, is_featured, created_at, updated_at)
      VALUES (
        gen_random_uuid(), v_store_id, v_cat_id,
        'Table Manger 6 Personnes', 'table-manger-6p', 'Table bois acacia 180cm, 6 personnes, livraison incluse',
        42000, 36000, 3, 'PUBLISHED',
        ROUND(v_rating::numeric, 1),
        (floor(random() * 120) + 5)::int,
        (floor(random() * 800) + 20)::int,
        (random() > 0.75),
        NOW(), NOW()
      ) RETURNING id INTO v_prod_id;

      INSERT INTO product_images (id, product_id, url_full, url_medium, url_thumb, public_id, is_primary, sort_order, created_at, updated_at)
      VALUES (gen_random_uuid(), v_prod_id, 'https://images.unsplash.com/photo-1533090481720-856c6e3c1fdc?w=700&q=90', 'https://images.unsplash.com/photo-1533090481720-856c6e3c1fdc?w=700&q=90', 'https://images.unsplash.com/photo-1533090481720-856c6e3c1fdc?w=700&q=90', 'seed_table-manger-6p', true, 0, NOW(), NOW());
    END IF;
  END IF;
END $$;


-- Produit 30: Bureau Informatique Blanc
DO $$
DECLARE
  v_store_id  UUID;
  v_cat_id    UUID;
  v_prod_id   UUID;
  v_rating    NUMERIC;
BEGIN
  SELECT st.id INTO v_store_id
  FROM stores st JOIN sellers s ON s.id = st.seller_id
  JOIN users u ON u.id = s.user_id WHERE u.email = 'jacmel.boutique@dealpam.com' AND st.is_primary = true LIMIT 1;

  SELECT id INTO v_cat_id FROM categories WHERE slug = 'meubles' LIMIT 1;

  IF v_store_id IS NOT NULL AND v_cat_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM products WHERE slug = 'bureau-informatique-blanc') THEN
      v_rating := 3.5 + random() * 1.5;
      INSERT INTO products (id, store_id, category_id, name, slug, description, price, sale_price, stock, status, avg_rating, total_reviews, view_count, is_featured, created_at, updated_at)
      VALUES (
        gen_random_uuid(), v_store_id, v_cat_id,
        'Bureau Informatique Blanc', 'bureau-informatique-blanc', 'Bureau blanc 120cm, plateau verre trempe',
        12000, 9800, 8, 'PUBLISHED',
        ROUND(v_rating::numeric, 1),
        (floor(random() * 120) + 5)::int,
        (floor(random() * 800) + 20)::int,
        (random() > 0.75),
        NOW(), NOW()
      ) RETURNING id INTO v_prod_id;

      INSERT INTO product_images (id, product_id, url_full, url_medium, url_thumb, public_id, is_primary, sort_order, created_at, updated_at)
      VALUES (gen_random_uuid(), v_prod_id, 'https://images.unsplash.com/photo-1518455027359-f3f8164ba6bd?w=700&q=90', 'https://images.unsplash.com/photo-1518455027359-f3f8164ba6bd?w=700&q=90', 'https://images.unsplash.com/photo-1518455027359-f3f8164ba6bd?w=700&q=90', 'seed_bureau-informatique-blanc', true, 0, NOW(), NOW());
    END IF;
  END IF;
END $$;


-- Produit 31: Etagere Murale Metal Noir
DO $$
DECLARE
  v_store_id  UUID;
  v_cat_id    UUID;
  v_prod_id   UUID;
  v_rating    NUMERIC;
BEGIN
  SELECT st.id INTO v_store_id
  FROM stores st JOIN sellers s ON s.id = st.seller_id
  JOIN users u ON u.id = s.user_id WHERE u.email = 'cayes.shop@dealpam.com' AND st.is_primary = true LIMIT 1;

  SELECT id INTO v_cat_id FROM categories WHERE slug = 'meubles' LIMIT 1;

  IF v_store_id IS NOT NULL AND v_cat_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM products WHERE slug = 'etagere-murale-metal') THEN
      v_rating := 3.5 + random() * 1.5;
      INSERT INTO products (id, store_id, category_id, name, slug, description, price, sale_price, stock, status, avg_rating, total_reviews, view_count, is_featured, created_at, updated_at)
      VALUES (
        gen_random_uuid(), v_store_id, v_cat_id,
        'Etagere Murale Metal Noir', 'etagere-murale-metal', 'Etagere murale metal noir 5 niveaux, 180cm hauteur',
        6500, 5500, 15, 'PUBLISHED',
        ROUND(v_rating::numeric, 1),
        (floor(random() * 120) + 5)::int,
        (floor(random() * 800) + 20)::int,
        (random() > 0.75),
        NOW(), NOW()
      ) RETURNING id INTO v_prod_id;

      INSERT INTO product_images (id, product_id, url_full, url_medium, url_thumb, public_id, is_primary, sort_order, created_at, updated_at)
      VALUES (gen_random_uuid(), v_prod_id, 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=700&q=90', 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=700&q=90', 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=700&q=90', 'seed_etagere-murale-metal', true, 0, NOW(), NOW());
    END IF;
  END IF;
END $$;


-- Produit 32: Parfum Chloe Rose 75ml
DO $$
DECLARE
  v_store_id  UUID;
  v_cat_id    UUID;
  v_prod_id   UUID;
  v_rating    NUMERIC;
BEGIN
  SELECT st.id INTO v_store_id
  FROM stores st JOIN sellers s ON s.id = st.seller_id
  JOIN users u ON u.id = s.user_id WHERE u.email = 'jacmel.boutique@dealpam.com' AND st.is_primary = true LIMIT 1;

  SELECT id INTO v_cat_id FROM categories WHERE slug = 'beaute' LIMIT 1;

  IF v_store_id IS NOT NULL AND v_cat_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM products WHERE slug = 'parfum-chloe-rose-75ml') THEN
      v_rating := 3.5 + random() * 1.5;
      INSERT INTO products (id, store_id, category_id, name, slug, description, price, sale_price, stock, status, avg_rating, total_reviews, view_count, is_featured, created_at, updated_at)
      VALUES (
        gen_random_uuid(), v_store_id, v_cat_id,
        'Parfum Chloe Rose 75ml', 'parfum-chloe-rose-75ml', 'Eau de parfum Chloe Rose 75ml, fragrance florale',
        12000, 9500, 20, 'PUBLISHED',
        ROUND(v_rating::numeric, 1),
        (floor(random() * 120) + 5)::int,
        (floor(random() * 800) + 20)::int,
        (random() > 0.75),
        NOW(), NOW()
      ) RETURNING id INTO v_prod_id;

      INSERT INTO product_images (id, product_id, url_full, url_medium, url_thumb, public_id, is_primary, sort_order, created_at, updated_at)
      VALUES (gen_random_uuid(), v_prod_id, 'https://images.unsplash.com/photo-1541643600914-78b084683702?w=700&q=90', 'https://images.unsplash.com/photo-1541643600914-78b084683702?w=700&q=90', 'https://images.unsplash.com/photo-1541643600914-78b084683702?w=700&q=90', 'seed_parfum-chloe-rose-75ml', true, 0, NOW(), NOW());
    END IF;
  END IF;
END $$;


-- Produit 33: Creme Visage SPF50 Hydratante
DO $$
DECLARE
  v_store_id  UUID;
  v_cat_id    UUID;
  v_prod_id   UUID;
  v_rating    NUMERIC;
BEGIN
  SELECT st.id INTO v_store_id
  FROM stores st JOIN sellers s ON s.id = st.seller_id
  JOIN users u ON u.id = s.user_id WHERE u.email = 'jacmel.boutique@dealpam.com' AND st.is_primary = true LIMIT 1;

  SELECT id INTO v_cat_id FROM categories WHERE slug = 'beaute' LIMIT 1;

  IF v_store_id IS NOT NULL AND v_cat_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM products WHERE slug = 'creme-visage-spf50') THEN
      v_rating := 3.5 + random() * 1.5;
      INSERT INTO products (id, store_id, category_id, name, slug, description, price, sale_price, stock, status, avg_rating, total_reviews, view_count, is_featured, created_at, updated_at)
      VALUES (
        gen_random_uuid(), v_store_id, v_cat_id,
        'Creme Visage SPF50 Hydratante', 'creme-visage-spf50', 'Creme hydratante SPF50, protection UVA/UVB quotidienne',
        4500, 3800, 35, 'PUBLISHED',
        ROUND(v_rating::numeric, 1),
        (floor(random() * 120) + 5)::int,
        (floor(random() * 800) + 20)::int,
        (random() > 0.75),
        NOW(), NOW()
      ) RETURNING id INTO v_prod_id;

      INSERT INTO product_images (id, product_id, url_full, url_medium, url_thumb, public_id, is_primary, sort_order, created_at, updated_at)
      VALUES (gen_random_uuid(), v_prod_id, 'https://images.unsplash.com/photo-1556228578-8c89e6adf883?w=700&q=90', 'https://images.unsplash.com/photo-1556228578-8c89e6adf883?w=700&q=90', 'https://images.unsplash.com/photo-1556228578-8c89e6adf883?w=700&q=90', 'seed_creme-visage-spf50', true, 0, NOW(), NOW());
    END IF;
  END IF;
END $$;


-- Produit 34: Set Maquillage Pro 12 Pieces
DO $$
DECLARE
  v_store_id  UUID;
  v_cat_id    UUID;
  v_prod_id   UUID;
  v_rating    NUMERIC;
BEGIN
  SELECT st.id INTO v_store_id
  FROM stores st JOIN sellers s ON s.id = st.seller_id
  JOIN users u ON u.id = s.user_id WHERE u.email = 'mode.chic@dealpam.com' AND st.is_primary = true LIMIT 1;

  SELECT id INTO v_cat_id FROM categories WHERE slug = 'beaute' LIMIT 1;

  IF v_store_id IS NOT NULL AND v_cat_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM products WHERE slug = 'set-maquillage-pro-12p') THEN
      v_rating := 3.5 + random() * 1.5;
      INSERT INTO products (id, store_id, category_id, name, slug, description, price, sale_price, stock, status, avg_rating, total_reviews, view_count, is_featured, created_at, updated_at)
      VALUES (
        gen_random_uuid(), v_store_id, v_cat_id,
        'Set Maquillage Pro 12 Pieces', 'set-maquillage-pro-12p', 'Set maquillage 12 pieces, fond de teint + mascara + palette',
        6800, 5500, 15, 'PUBLISHED',
        ROUND(v_rating::numeric, 1),
        (floor(random() * 120) + 5)::int,
        (floor(random() * 800) + 20)::int,
        (random() > 0.75),
        NOW(), NOW()
      ) RETURNING id INTO v_prod_id;

      INSERT INTO product_images (id, product_id, url_full, url_medium, url_thumb, public_id, is_primary, sort_order, created_at, updated_at)
      VALUES (gen_random_uuid(), v_prod_id, 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=700&q=90', 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=700&q=90', 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=700&q=90', 'seed_set-maquillage-pro-12p', true, 0, NOW(), NOW());
    END IF;
  END IF;
END $$;


-- Produit 35: Shampoing Keratine 500ml
DO $$
DECLARE
  v_store_id  UUID;
  v_cat_id    UUID;
  v_prod_id   UUID;
  v_rating    NUMERIC;
BEGIN
  SELECT st.id INTO v_store_id
  FROM stores st JOIN sellers s ON s.id = st.seller_id
  JOIN users u ON u.id = s.user_id WHERE u.email = 'gonaives.market@dealpam.com' AND st.is_primary = true LIMIT 1;

  SELECT id INTO v_cat_id FROM categories WHERE slug = 'beaute' LIMIT 1;

  IF v_store_id IS NOT NULL AND v_cat_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM products WHERE slug = 'shampoing-keratine-500ml') THEN
      v_rating := 3.5 + random() * 1.5;
      INSERT INTO products (id, store_id, category_id, name, slug, description, price, sale_price, stock, status, avg_rating, total_reviews, view_count, is_featured, created_at, updated_at)
      VALUES (
        gen_random_uuid(), v_store_id, v_cat_id,
        'Shampoing Keratine 500ml', 'shampoing-keratine-500ml', 'Shampoing keratine 500ml, lisse, tous types cheveux',
        2200, 1800, 50, 'PUBLISHED',
        ROUND(v_rating::numeric, 1),
        (floor(random() * 120) + 5)::int,
        (floor(random() * 800) + 20)::int,
        (random() > 0.75),
        NOW(), NOW()
      ) RETURNING id INTO v_prod_id;

      INSERT INTO product_images (id, product_id, url_full, url_medium, url_thumb, public_id, is_primary, sort_order, created_at, updated_at)
      VALUES (gen_random_uuid(), v_prod_id, 'https://images.unsplash.com/photo-1527799820374-dcf8d9d4a388?w=700&q=90', 'https://images.unsplash.com/photo-1527799820374-dcf8d9d4a388?w=700&q=90', 'https://images.unsplash.com/photo-1527799820374-dcf8d9d4a388?w=700&q=90', 'seed_shampoing-keratine-500ml', true, 0, NOW(), NOW());
    END IF;
  END IF;
END $$;


-- Produit 36: Huile Argan Pure Maroc 100ml
DO $$
DECLARE
  v_store_id  UUID;
  v_cat_id    UUID;
  v_prod_id   UUID;
  v_rating    NUMERIC;
BEGIN
  SELECT st.id INTO v_store_id
  FROM stores st JOIN sellers s ON s.id = st.seller_id
  JOIN users u ON u.id = s.user_id WHERE u.email = 'jacmel.boutique@dealpam.com' AND st.is_primary = true LIMIT 1;

  SELECT id INTO v_cat_id FROM categories WHERE slug = 'beaute' LIMIT 1;

  IF v_store_id IS NOT NULL AND v_cat_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM products WHERE slug = 'huile-argan-pure-100ml') THEN
      v_rating := 3.5 + random() * 1.5;
      INSERT INTO products (id, store_id, category_id, name, slug, description, price, sale_price, stock, status, avg_rating, total_reviews, view_count, is_featured, created_at, updated_at)
      VALUES (
        gen_random_uuid(), v_store_id, v_cat_id,
        'Huile Argan Pure Maroc 100ml', 'huile-argan-pure-100ml', 'Huile d''argan 100% pure 100ml, cheveux et peau',
        3200, 2700, 30, 'PUBLISHED',
        ROUND(v_rating::numeric, 1),
        (floor(random() * 120) + 5)::int,
        (floor(random() * 800) + 20)::int,
        (random() > 0.75),
        NOW(), NOW()
      ) RETURNING id INTO v_prod_id;

      INSERT INTO product_images (id, product_id, url_full, url_medium, url_thumb, public_id, is_primary, sort_order, created_at, updated_at)
      VALUES (gen_random_uuid(), v_prod_id, 'https://images.unsplash.com/photo-1547592166-23ac45744acd?w=700&q=90', 'https://images.unsplash.com/photo-1547592166-23ac45744acd?w=700&q=90', 'https://images.unsplash.com/photo-1547592166-23ac45744acd?w=700&q=90', 'seed_huile-argan-pure-100ml', true, 0, NOW(), NOW());
    END IF;
  END IF;
END $$;


-- Produit 37: Ventilateur Plafond 52 pouces
DO $$
DECLARE
  v_store_id  UUID;
  v_cat_id    UUID;
  v_prod_id   UUID;
  v_rating    NUMERIC;
BEGIN
  SELECT st.id INTO v_store_id
  FROM stores st JOIN sellers s ON s.id = st.seller_id
  JOIN users u ON u.id = s.user_id WHERE u.email = 'cayes.shop@dealpam.com' AND st.is_primary = true LIMIT 1;

  SELECT id INTO v_cat_id FROM categories WHERE slug = 'maison' LIMIT 1;

  IF v_store_id IS NOT NULL AND v_cat_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM products WHERE slug = 'ventilateur-plafond-52p') THEN
      v_rating := 3.5 + random() * 1.5;
      INSERT INTO products (id, store_id, category_id, name, slug, description, price, sale_price, stock, status, avg_rating, total_reviews, view_count, is_featured, created_at, updated_at)
      VALUES (
        gen_random_uuid(), v_store_id, v_cat_id,
        'Ventilateur Plafond 52 pouces', 'ventilateur-plafond-52p', 'Ventilateur 52 pouces, 3 vitesses, silencieux, telecommande',
        9500, 7800, 12, 'PUBLISHED',
        ROUND(v_rating::numeric, 1),
        (floor(random() * 120) + 5)::int,
        (floor(random() * 800) + 20)::int,
        (random() > 0.75),
        NOW(), NOW()
      ) RETURNING id INTO v_prod_id;

      INSERT INTO product_images (id, product_id, url_full, url_medium, url_thumb, public_id, is_primary, sort_order, created_at, updated_at)
      VALUES (gen_random_uuid(), v_prod_id, 'https://images.unsplash.com/photo-1513694203232-719a280e022f?w=700&q=90', 'https://images.unsplash.com/photo-1513694203232-719a280e022f?w=700&q=90', 'https://images.unsplash.com/photo-1513694203232-719a280e022f?w=700&q=90', 'seed_ventilateur-plafond-52p', true, 0, NOW(), NOW());
    END IF;
  END IF;
END $$;


-- Produit 38: Refrigerateur LG 350L NoFrost
DO $$
DECLARE
  v_store_id  UUID;
  v_cat_id    UUID;
  v_prod_id   UUID;
  v_rating    NUMERIC;
BEGIN
  SELECT st.id INTO v_store_id
  FROM stores st JOIN sellers s ON s.id = st.seller_id
  JOIN users u ON u.id = s.user_id WHERE u.email = 'cayes.shop@dealpam.com' AND st.is_primary = true LIMIT 1;

  SELECT id INTO v_cat_id FROM categories WHERE slug = 'maison' LIMIT 1;

  IF v_store_id IS NOT NULL AND v_cat_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM products WHERE slug = 'refrigerateur-lg-350l') THEN
      v_rating := 3.5 + random() * 1.5;
      INSERT INTO products (id, store_id, category_id, name, slug, description, price, sale_price, stock, status, avg_rating, total_reviews, view_count, is_featured, created_at, updated_at)
      VALUES (
        gen_random_uuid(), v_store_id, v_cat_id,
        'Refrigerateur LG 350L NoFrost', 'refrigerateur-lg-350l', 'LG 350L NoFrost, double porte, distributeur eau, A++',
        48000, 42000, 4, 'PUBLISHED',
        ROUND(v_rating::numeric, 1),
        (floor(random() * 120) + 5)::int,
        (floor(random() * 800) + 20)::int,
        (random() > 0.75),
        NOW(), NOW()
      ) RETURNING id INTO v_prod_id;

      INSERT INTO product_images (id, product_id, url_full, url_medium, url_thumb, public_id, is_primary, sort_order, created_at, updated_at)
      VALUES (gen_random_uuid(), v_prod_id, 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=700&q=90', 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=700&q=90', 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=700&q=90', 'seed_refrigerateur-lg-350l', true, 0, NOW(), NOW());
    END IF;
  END IF;
END $$;


-- Produit 39: Climatiseur Inverter 12000 BTU
DO $$
DECLARE
  v_store_id  UUID;
  v_cat_id    UUID;
  v_prod_id   UUID;
  v_rating    NUMERIC;
BEGIN
  SELECT st.id INTO v_store_id
  FROM stores st JOIN sellers s ON s.id = st.seller_id
  JOIN users u ON u.id = s.user_id WHERE u.email = 'jacmel.boutique@dealpam.com' AND st.is_primary = true LIMIT 1;

  SELECT id INTO v_cat_id FROM categories WHERE slug = 'maison' LIMIT 1;

  IF v_store_id IS NOT NULL AND v_cat_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM products WHERE slug = 'climatiseur-inverter-12kbtu') THEN
      v_rating := 3.5 + random() * 1.5;
      INSERT INTO products (id, store_id, category_id, name, slug, description, price, sale_price, stock, status, avg_rating, total_reviews, view_count, is_featured, created_at, updated_at)
      VALUES (
        gen_random_uuid(), v_store_id, v_cat_id,
        'Climatiseur Inverter 12000 BTU', 'climatiseur-inverter-12kbtu', 'Split 12000 BTU inverter, Wi-Fi, classe A, silencieux',
        38000, 34000, 6, 'PUBLISHED',
        ROUND(v_rating::numeric, 1),
        (floor(random() * 120) + 5)::int,
        (floor(random() * 800) + 20)::int,
        (random() > 0.75),
        NOW(), NOW()
      ) RETURNING id INTO v_prod_id;

      INSERT INTO product_images (id, product_id, url_full, url_medium, url_thumb, public_id, is_primary, sort_order, created_at, updated_at)
      VALUES (gen_random_uuid(), v_prod_id, 'https://images.unsplash.com/photo-1585771724684-38269d6639fd?w=700&q=90', 'https://images.unsplash.com/photo-1585771724684-38269d6639fd?w=700&q=90', 'https://images.unsplash.com/photo-1585771724684-38269d6639fd?w=700&q=90', 'seed_climatiseur-inverter-12kbtu', true, 0, NOW(), NOW());
    END IF;
  END IF;
END $$;


-- Produit 40: Machine a Laver 7kg Frontal
DO $$
DECLARE
  v_store_id  UUID;
  v_cat_id    UUID;
  v_prod_id   UUID;
  v_rating    NUMERIC;
BEGIN
  SELECT st.id INTO v_store_id
  FROM stores st JOIN sellers s ON s.id = st.seller_id
  JOIN users u ON u.id = s.user_id WHERE u.email = 'gonaives.market@dealpam.com' AND st.is_primary = true LIMIT 1;

  SELECT id INTO v_cat_id FROM categories WHERE slug = 'maison' LIMIT 1;

  IF v_store_id IS NOT NULL AND v_cat_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM products WHERE slug = 'machine-laver-7kg') THEN
      v_rating := 3.5 + random() * 1.5;
      INSERT INTO products (id, store_id, category_id, name, slug, description, price, sale_price, stock, status, avg_rating, total_reviews, view_count, is_featured, created_at, updated_at)
      VALUES (
        gen_random_uuid(), v_store_id, v_cat_id,
        'Machine a Laver 7kg Frontal', 'machine-laver-7kg', 'Machine a laver 7kg frontal, 15 programmes, A+++',
        32000, 28000, 5, 'PUBLISHED',
        ROUND(v_rating::numeric, 1),
        (floor(random() * 120) + 5)::int,
        (floor(random() * 800) + 20)::int,
        (random() > 0.75),
        NOW(), NOW()
      ) RETURNING id INTO v_prod_id;

      INSERT INTO product_images (id, product_id, url_full, url_medium, url_thumb, public_id, is_primary, sort_order, created_at, updated_at)
      VALUES (gen_random_uuid(), v_prod_id, 'https://images.unsplash.com/photo-1626806787461-102c1bfaaea1?w=700&q=90', 'https://images.unsplash.com/photo-1626806787461-102c1bfaaea1?w=700&q=90', 'https://images.unsplash.com/photo-1626806787461-102c1bfaaea1?w=700&q=90', 'seed_machine-laver-7kg', true, 0, NOW(), NOW());
    END IF;
  END IF;
END $$;


-- Produit 41: Generatrice Essence 3KW Honda
DO $$
DECLARE
  v_store_id  UUID;
  v_cat_id    UUID;
  v_prod_id   UUID;
  v_rating    NUMERIC;
BEGIN
  SELECT st.id INTO v_store_id
  FROM stores st JOIN sellers s ON s.id = st.seller_id
  JOIN users u ON u.id = s.user_id WHERE u.email = 'cayes.shop@dealpam.com' AND st.is_primary = true LIMIT 1;

  SELECT id INTO v_cat_id FROM categories WHERE slug = 'maison' LIMIT 1;

  IF v_store_id IS NOT NULL AND v_cat_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM products WHERE slug = 'generatrice-honda-3kw') THEN
      v_rating := 3.5 + random() * 1.5;
      INSERT INTO products (id, store_id, category_id, name, slug, description, price, sale_price, stock, status, avg_rating, total_reviews, view_count, is_featured, created_at, updated_at)
      VALUES (
        gen_random_uuid(), v_store_id, v_cat_id,
        'Generatrice Essence 3KW Honda', 'generatrice-honda-3kw', 'Honda 3KW essence, silencieuse, autonomie 8h, garantie 2 ans',
        65000, 58000, 8, 'PUBLISHED',
        ROUND(v_rating::numeric, 1),
        (floor(random() * 120) + 5)::int,
        (floor(random() * 800) + 20)::int,
        (random() > 0.75),
        NOW(), NOW()
      ) RETURNING id INTO v_prod_id;

      INSERT INTO product_images (id, product_id, url_full, url_medium, url_thumb, public_id, is_primary, sort_order, created_at, updated_at)
      VALUES (gen_random_uuid(), v_prod_id, 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=700&q=90', 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=700&q=90', 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=700&q=90', 'seed_generatrice-honda-3kw', true, 0, NOW(), NOW());
    END IF;
  END IF;
END $$;


-- Produit 42: Nike Air Max 270 Blanc
DO $$
DECLARE
  v_store_id  UUID;
  v_cat_id    UUID;
  v_prod_id   UUID;
  v_rating    NUMERIC;
BEGIN
  SELECT st.id INTO v_store_id
  FROM stores st JOIN sellers s ON s.id = st.seller_id
  JOIN users u ON u.id = s.user_id WHERE u.email = 'mode.chic@dealpam.com' AND st.is_primary = true LIMIT 1;

  SELECT id INTO v_cat_id FROM categories WHERE slug = 'chaussures' LIMIT 1;

  IF v_store_id IS NOT NULL AND v_cat_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM products WHERE slug = 'nike-air-max-270-blanc') THEN
      v_rating := 3.5 + random() * 1.5;
      INSERT INTO products (id, store_id, category_id, name, slug, description, price, sale_price, stock, status, avg_rating, total_reviews, view_count, is_featured, created_at, updated_at)
      VALUES (
        gen_random_uuid(), v_store_id, v_cat_id,
        'Nike Air Max 270 Blanc', 'nike-air-max-270-blanc', 'Nike Air Max 270 blanc/noir, T38-46',
        12000, 9500, 25, 'PUBLISHED',
        ROUND(v_rating::numeric, 1),
        (floor(random() * 120) + 5)::int,
        (floor(random() * 800) + 20)::int,
        (random() > 0.75),
        NOW(), NOW()
      ) RETURNING id INTO v_prod_id;

      INSERT INTO product_images (id, product_id, url_full, url_medium, url_thumb, public_id, is_primary, sort_order, created_at, updated_at)
      VALUES (gen_random_uuid(), v_prod_id, 'https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?w=700&q=90', 'https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?w=700&q=90', 'https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?w=700&q=90', 'seed_nike-air-max-270-blanc', true, 0, NOW(), NOW());
    END IF;
  END IF;
END $$;


-- Produit 43: Escarpins Femme Rouge 8cm
DO $$
DECLARE
  v_store_id  UUID;
  v_cat_id    UUID;
  v_prod_id   UUID;
  v_rating    NUMERIC;
BEGIN
  SELECT st.id INTO v_store_id
  FROM stores st JOIN sellers s ON s.id = st.seller_id
  JOIN users u ON u.id = s.user_id WHERE u.email = 'mode.chic@dealpam.com' AND st.is_primary = true LIMIT 1;

  SELECT id INTO v_cat_id FROM categories WHERE slug = 'chaussures' LIMIT 1;

  IF v_store_id IS NOT NULL AND v_cat_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM products WHERE slug = 'escarpins-rouge-8cm') THEN
      v_rating := 3.5 + random() * 1.5;
      INSERT INTO products (id, store_id, category_id, name, slug, description, price, sale_price, stock, status, avg_rating, total_reviews, view_count, is_featured, created_at, updated_at)
      VALUES (
        gen_random_uuid(), v_store_id, v_cat_id,
        'Escarpins Femme Rouge 8cm', 'escarpins-rouge-8cm', 'Escarpins talon 8cm rouge, bout pointu, T35-41',
        5500, 4200, 18, 'PUBLISHED',
        ROUND(v_rating::numeric, 1),
        (floor(random() * 120) + 5)::int,
        (floor(random() * 800) + 20)::int,
        (random() > 0.75),
        NOW(), NOW()
      ) RETURNING id INTO v_prod_id;

      INSERT INTO product_images (id, product_id, url_full, url_medium, url_thumb, public_id, is_primary, sort_order, created_at, updated_at)
      VALUES (gen_random_uuid(), v_prod_id, 'https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=700&q=90', 'https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=700&q=90', 'https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=700&q=90', 'seed_escarpins-rouge-8cm', true, 0, NOW(), NOW());
    END IF;
  END IF;
END $$;


-- Produit 44: Sandales Cuir Homme Marron
DO $$
DECLARE
  v_store_id  UUID;
  v_cat_id    UUID;
  v_prod_id   UUID;
  v_rating    NUMERIC;
BEGIN
  SELECT st.id INTO v_store_id
  FROM stores st JOIN sellers s ON s.id = st.seller_id
  JOIN users u ON u.id = s.user_id WHERE u.email = 'gonaives.market@dealpam.com' AND st.is_primary = true LIMIT 1;

  SELECT id INTO v_cat_id FROM categories WHERE slug = 'chaussures' LIMIT 1;

  IF v_store_id IS NOT NULL AND v_cat_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM products WHERE slug = 'sandales-cuir-marron') THEN
      v_rating := 3.5 + random() * 1.5;
      INSERT INTO products (id, store_id, category_id, name, slug, description, price, sale_price, stock, status, avg_rating, total_reviews, view_count, is_featured, created_at, updated_at)
      VALUES (
        gen_random_uuid(), v_store_id, v_cat_id,
        'Sandales Cuir Homme Marron', 'sandales-cuir-marron', 'Sandales cuir veritable, semelle anatomique, T39-46',
        2200, NULL, 40, 'PUBLISHED',
        ROUND(v_rating::numeric, 1),
        (floor(random() * 120) + 5)::int,
        (floor(random() * 800) + 20)::int,
        (random() > 0.75),
        NOW(), NOW()
      ) RETURNING id INTO v_prod_id;

      INSERT INTO product_images (id, product_id, url_full, url_medium, url_thumb, public_id, is_primary, sort_order, created_at, updated_at)
      VALUES (gen_random_uuid(), v_prod_id, 'https://images.unsplash.com/photo-1603487742131-4160ec999306?w=700&q=90', 'https://images.unsplash.com/photo-1603487742131-4160ec999306?w=700&q=90', 'https://images.unsplash.com/photo-1603487742131-4160ec999306?w=700&q=90', 'seed_sandales-cuir-marron', true, 0, NOW(), NOW());
    END IF;
  END IF;
END $$;


-- Produit 45: Adidas Stan Smith Blanc
DO $$
DECLARE
  v_store_id  UUID;
  v_cat_id    UUID;
  v_prod_id   UUID;
  v_rating    NUMERIC;
BEGIN
  SELECT st.id INTO v_store_id
  FROM stores st JOIN sellers s ON s.id = st.seller_id
  JOIN users u ON u.id = s.user_id WHERE u.email = 'cayes.shop@dealpam.com' AND st.is_primary = true LIMIT 1;

  SELECT id INTO v_cat_id FROM categories WHERE slug = 'chaussures' LIMIT 1;

  IF v_store_id IS NOT NULL AND v_cat_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM products WHERE slug = 'adidas-stan-smith-blanc') THEN
      v_rating := 3.5 + random() * 1.5;
      INSERT INTO products (id, store_id, category_id, name, slug, description, price, sale_price, stock, status, avg_rating, total_reviews, view_count, is_featured, created_at, updated_at)
      VALUES (
        gen_random_uuid(), v_store_id, v_cat_id,
        'Adidas Stan Smith Blanc', 'adidas-stan-smith-blanc', 'Adidas Stan Smith cuir, blanc/vert, T36-46',
        9500, 8000, 20, 'PUBLISHED',
        ROUND(v_rating::numeric, 1),
        (floor(random() * 120) + 5)::int,
        (floor(random() * 800) + 20)::int,
        (random() > 0.75),
        NOW(), NOW()
      ) RETURNING id INTO v_prod_id;

      INSERT INTO product_images (id, product_id, url_full, url_medium, url_thumb, public_id, is_primary, sort_order, created_at, updated_at)
      VALUES (gen_random_uuid(), v_prod_id, 'https://images.unsplash.com/photo-1491553895911-0055eca6402d?w=700&q=90', 'https://images.unsplash.com/photo-1491553895911-0055eca6402d?w=700&q=90', 'https://images.unsplash.com/photo-1491553895911-0055eca6402d?w=700&q=90', 'seed_adidas-stan-smith-blanc', true, 0, NOW(), NOW());
    END IF;
  END IF;
END $$;


-- Produit 46: Boots Chelsea Cuir Noir
DO $$
DECLARE
  v_store_id  UUID;
  v_cat_id    UUID;
  v_prod_id   UUID;
  v_rating    NUMERIC;
BEGIN
  SELECT st.id INTO v_store_id
  FROM stores st JOIN sellers s ON s.id = st.seller_id
  JOIN users u ON u.id = s.user_id WHERE u.email = 'jacmel.boutique@dealpam.com' AND st.is_primary = true LIMIT 1;

  SELECT id INTO v_cat_id FROM categories WHERE slug = 'chaussures' LIMIT 1;

  IF v_store_id IS NOT NULL AND v_cat_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM products WHERE slug = 'boots-chelsea-cuir-noir') THEN
      v_rating := 3.5 + random() * 1.5;
      INSERT INTO products (id, store_id, category_id, name, slug, description, price, sale_price, stock, status, avg_rating, total_reviews, view_count, is_featured, created_at, updated_at)
      VALUES (
        gen_random_uuid(), v_store_id, v_cat_id,
        'Boots Chelsea Cuir Noir', 'boots-chelsea-cuir-noir', 'Boots Chelsea cuir noir, elastiques lateraux, T38-45',
        7500, 6200, 14, 'PUBLISHED',
        ROUND(v_rating::numeric, 1),
        (floor(random() * 120) + 5)::int,
        (floor(random() * 800) + 20)::int,
        (random() > 0.75),
        NOW(), NOW()
      ) RETURNING id INTO v_prod_id;

      INSERT INTO product_images (id, product_id, url_full, url_medium, url_thumb, public_id, is_primary, sort_order, created_at, updated_at)
      VALUES (gen_random_uuid(), v_prod_id, 'https://images.unsplash.com/photo-1520639888713-7851133b1ed0?w=700&q=90', 'https://images.unsplash.com/photo-1520639888713-7851133b1ed0?w=700&q=90', 'https://images.unsplash.com/photo-1520639888713-7851133b1ed0?w=700&q=90', 'seed_boots-chelsea-cuir-noir', true, 0, NOW(), NOW());
    END IF;
  END IF;
END $$;


-- Produit 47: Velo VTT 26 pouces 21v
DO $$
DECLARE
  v_store_id  UUID;
  v_cat_id    UUID;
  v_prod_id   UUID;
  v_rating    NUMERIC;
BEGIN
  SELECT st.id INTO v_store_id
  FROM stores st JOIN sellers s ON s.id = st.seller_id
  JOIN users u ON u.id = s.user_id WHERE u.email = 'cayes.shop@dealpam.com' AND st.is_primary = true LIMIT 1;

  SELECT id INTO v_cat_id FROM categories WHERE slug = 'sport' LIMIT 1;

  IF v_store_id IS NOT NULL AND v_cat_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM products WHERE slug = 'velo-vtt-26-21v') THEN
      v_rating := 3.5 + random() * 1.5;
      INSERT INTO products (id, store_id, category_id, name, slug, description, price, sale_price, stock, status, avg_rating, total_reviews, view_count, is_featured, created_at, updated_at)
      VALUES (
        gen_random_uuid(), v_store_id, v_cat_id,
        'Velo VTT 26 pouces 21v', 'velo-vtt-26-21v', 'VTT 26 pouces alu, 21 vitesses Shimano, freins disque',
        28000, 24000, 5, 'PUBLISHED',
        ROUND(v_rating::numeric, 1),
        (floor(random() * 120) + 5)::int,
        (floor(random() * 800) + 20)::int,
        (random() > 0.75),
        NOW(), NOW()
      ) RETURNING id INTO v_prod_id;

      INSERT INTO product_images (id, product_id, url_full, url_medium, url_thumb, public_id, is_primary, sort_order, created_at, updated_at)
      VALUES (gen_random_uuid(), v_prod_id, 'https://images.unsplash.com/photo-1485965120184-e220f721d03e?w=700&q=90', 'https://images.unsplash.com/photo-1485965120184-e220f721d03e?w=700&q=90', 'https://images.unsplash.com/photo-1485965120184-e220f721d03e?w=700&q=90', 'seed_velo-vtt-26-21v', true, 0, NOW(), NOW());
    END IF;
  END IF;
END $$;


-- Produit 48: Halteres Reglables 20kg Paire
DO $$
DECLARE
  v_store_id  UUID;
  v_cat_id    UUID;
  v_prod_id   UUID;
  v_rating    NUMERIC;
BEGIN
  SELECT st.id INTO v_store_id
  FROM stores st JOIN sellers s ON s.id = st.seller_id
  JOIN users u ON u.id = s.user_id WHERE u.email = 'gonaives.market@dealpam.com' AND st.is_primary = true LIMIT 1;

  SELECT id INTO v_cat_id FROM categories WHERE slug = 'sport' LIMIT 1;

  IF v_store_id IS NOT NULL AND v_cat_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM products WHERE slug = 'halteres-reglables-20kg') THEN
      v_rating := 3.5 + random() * 1.5;
      INSERT INTO products (id, store_id, category_id, name, slug, description, price, sale_price, stock, status, avg_rating, total_reviews, view_count, is_featured, created_at, updated_at)
      VALUES (
        gen_random_uuid(), v_store_id, v_cat_id,
        'Halteres Reglables 20kg Paire', 'halteres-reglables-20kg', 'Halteres 2-20kg fonte, barre chrome 35cm',
        8500, NULL, 10, 'PUBLISHED',
        ROUND(v_rating::numeric, 1),
        (floor(random() * 120) + 5)::int,
        (floor(random() * 800) + 20)::int,
        (random() > 0.75),
        NOW(), NOW()
      ) RETURNING id INTO v_prod_id;

      INSERT INTO product_images (id, product_id, url_full, url_medium, url_thumb, public_id, is_primary, sort_order, created_at, updated_at)
      VALUES (gen_random_uuid(), v_prod_id, 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=700&q=90', 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=700&q=90', 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=700&q=90', 'seed_halteres-reglables-20kg', true, 0, NOW(), NOW());
    END IF;
  END IF;
END $$;


-- Produit 49: Maillot PSG 2024/25
DO $$
DECLARE
  v_store_id  UUID;
  v_cat_id    UUID;
  v_prod_id   UUID;
  v_rating    NUMERIC;
BEGIN
  SELECT st.id INTO v_store_id
  FROM stores st JOIN sellers s ON s.id = st.seller_id
  JOIN users u ON u.id = s.user_id WHERE u.email = 'jacmel.boutique@dealpam.com' AND st.is_primary = true LIMIT 1;

  SELECT id INTO v_cat_id FROM categories WHERE slug = 'sport' LIMIT 1;

  IF v_store_id IS NOT NULL AND v_cat_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM products WHERE slug = 'maillot-psg-2024-25') THEN
      v_rating := 3.5 + random() * 1.5;
      INSERT INTO products (id, store_id, category_id, name, slug, description, price, sale_price, stock, status, avg_rating, total_reviews, view_count, is_featured, created_at, updated_at)
      VALUES (
        gen_random_uuid(), v_store_id, v_cat_id,
        'Maillot PSG 2024/25', 'maillot-psg-2024-25', 'Maillot PSG domicile 2024/25, Dri-FIT, S a XXL',
        4500, 3500, 30, 'PUBLISHED',
        ROUND(v_rating::numeric, 1),
        (floor(random() * 120) + 5)::int,
        (floor(random() * 800) + 20)::int,
        (random() > 0.75),
        NOW(), NOW()
      ) RETURNING id INTO v_prod_id;

      INSERT INTO product_images (id, product_id, url_full, url_medium, url_thumb, public_id, is_primary, sort_order, created_at, updated_at)
      VALUES (gen_random_uuid(), v_prod_id, 'https://images.unsplash.com/photo-1522778119026-d647f0596c20?w=700&q=90', 'https://images.unsplash.com/photo-1522778119026-d647f0596c20?w=700&q=90', 'https://images.unsplash.com/photo-1522778119026-d647f0596c20?w=700&q=90', 'seed_maillot-psg-2024-25', true, 0, NOW(), NOW());
    END IF;
  END IF;
END $$;


-- Produit 50: Tapis Yoga Antiderapant 6mm
DO $$
DECLARE
  v_store_id  UUID;
  v_cat_id    UUID;
  v_prod_id   UUID;
  v_rating    NUMERIC;
BEGIN
  SELECT st.id INTO v_store_id
  FROM stores st JOIN sellers s ON s.id = st.seller_id
  JOIN users u ON u.id = s.user_id WHERE u.email = 'cayes.shop@dealpam.com' AND st.is_primary = true LIMIT 1;

  SELECT id INTO v_cat_id FROM categories WHERE slug = 'sport' LIMIT 1;

  IF v_store_id IS NOT NULL AND v_cat_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM products WHERE slug = 'tapis-yoga-6mm') THEN
      v_rating := 3.5 + random() * 1.5;
      INSERT INTO products (id, store_id, category_id, name, slug, description, price, sale_price, stock, status, avg_rating, total_reviews, view_count, is_featured, created_at, updated_at)
      VALUES (
        gen_random_uuid(), v_store_id, v_cat_id,
        'Tapis Yoga Antiderapant 6mm', 'tapis-yoga-6mm', 'Tapis yoga 6mm, antiderapant, lavable, sac inclus',
        3500, 2800, 25, 'PUBLISHED',
        ROUND(v_rating::numeric, 1),
        (floor(random() * 120) + 5)::int,
        (floor(random() * 800) + 20)::int,
        (random() > 0.75),
        NOW(), NOW()
      ) RETURNING id INTO v_prod_id;

      INSERT INTO product_images (id, product_id, url_full, url_medium, url_thumb, public_id, is_primary, sort_order, created_at, updated_at)
      VALUES (gen_random_uuid(), v_prod_id, 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=700&q=90', 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=700&q=90', 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=700&q=90', 'seed_tapis-yoga-6mm', true, 0, NOW(), NOW());
    END IF;
  END IF;
END $$;


-- Produit 51: Ballon Football Adidas Size 5
DO $$
DECLARE
  v_store_id  UUID;
  v_cat_id    UUID;
  v_prod_id   UUID;
  v_rating    NUMERIC;
BEGIN
  SELECT st.id INTO v_store_id
  FROM stores st JOIN sellers s ON s.id = st.seller_id
  JOIN users u ON u.id = s.user_id WHERE u.email = 'gonaives.market@dealpam.com' AND st.is_primary = true LIMIT 1;

  SELECT id INTO v_cat_id FROM categories WHERE slug = 'sport' LIMIT 1;

  IF v_store_id IS NOT NULL AND v_cat_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM products WHERE slug = 'ballon-football-adidas-5') THEN
      v_rating := 3.5 + random() * 1.5;
      INSERT INTO products (id, store_id, category_id, name, slug, description, price, sale_price, stock, status, avg_rating, total_reviews, view_count, is_featured, created_at, updated_at)
      VALUES (
        gen_random_uuid(), v_store_id, v_cat_id,
        'Ballon Football Adidas Size 5', 'ballon-football-adidas-5', 'Ballon football Adidas taille 5, cousu a la main, tous terrains',
        2500, NULL, 50, 'PUBLISHED',
        ROUND(v_rating::numeric, 1),
        (floor(random() * 120) + 5)::int,
        (floor(random() * 800) + 20)::int,
        (random() > 0.75),
        NOW(), NOW()
      ) RETURNING id INTO v_prod_id;

      INSERT INTO product_images (id, product_id, url_full, url_medium, url_thumb, public_id, is_primary, sort_order, created_at, updated_at)
      VALUES (gen_random_uuid(), v_prod_id, 'https://images.unsplash.com/photo-1579952363873-27f3bade9f55?w=700&q=90', 'https://images.unsplash.com/photo-1579952363873-27f3bade9f55?w=700&q=90', 'https://images.unsplash.com/photo-1579952363873-27f3bade9f55?w=700&q=90', 'seed_ballon-football-adidas-5', true, 0, NOW(), NOW());
    END IF;
  END IF;
END $$;


-- Produit 52: Cafe Haiti Blue Mountain 500g
DO $$
DECLARE
  v_store_id  UUID;
  v_cat_id    UUID;
  v_prod_id   UUID;
  v_rating    NUMERIC;
BEGIN
  SELECT st.id INTO v_store_id
  FROM stores st JOIN sellers s ON s.id = st.seller_id
  JOIN users u ON u.id = s.user_id WHERE u.email = 'gonaives.market@dealpam.com' AND st.is_primary = true LIMIT 1;

  SELECT id INTO v_cat_id FROM categories WHERE slug = 'alimentation' LIMIT 1;

  IF v_store_id IS NOT NULL AND v_cat_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM products WHERE slug = 'cafe-blue-mountain-500g') THEN
      v_rating := 3.5 + random() * 1.5;
      INSERT INTO products (id, store_id, category_id, name, slug, description, price, sale_price, stock, status, avg_rating, total_reviews, view_count, is_featured, created_at, updated_at)
      VALUES (
        gen_random_uuid(), v_store_id, v_cat_id,
        'Cafe Haiti Blue Mountain 500g', 'cafe-blue-mountain-500g', 'Cafe arabica Blue Mountain Haiti 500g, torrefaction artisanale',
        1800, NULL, 100, 'PUBLISHED',
        ROUND(v_rating::numeric, 1),
        (floor(random() * 120) + 5)::int,
        (floor(random() * 800) + 20)::int,
        (random() > 0.75),
        NOW(), NOW()
      ) RETURNING id INTO v_prod_id;

      INSERT INTO product_images (id, product_id, url_full, url_medium, url_thumb, public_id, is_primary, sort_order, created_at, updated_at)
      VALUES (gen_random_uuid(), v_prod_id, 'https://images.unsplash.com/photo-1447933601403-0c6688de566e?w=700&q=90', 'https://images.unsplash.com/photo-1447933601403-0c6688de566e?w=700&q=90', 'https://images.unsplash.com/photo-1447933601403-0c6688de566e?w=700&q=90', 'seed_cafe-blue-mountain-500g', true, 0, NOW(), NOW());
    END IF;
  END IF;
END $$;


-- Produit 53: Rhum Barbancourt 15 ans 700ml
DO $$
DECLARE
  v_store_id  UUID;
  v_cat_id    UUID;
  v_prod_id   UUID;
  v_rating    NUMERIC;
BEGIN
  SELECT st.id INTO v_store_id
  FROM stores st JOIN sellers s ON s.id = st.seller_id
  JOIN users u ON u.id = s.user_id WHERE u.email = 'cayes.shop@dealpam.com' AND st.is_primary = true LIMIT 1;

  SELECT id INTO v_cat_id FROM categories WHERE slug = 'alimentation' LIMIT 1;

  IF v_store_id IS NOT NULL AND v_cat_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM products WHERE slug = 'rhum-barbancourt-15ans') THEN
      v_rating := 3.5 + random() * 1.5;
      INSERT INTO products (id, store_id, category_id, name, slug, description, price, sale_price, stock, status, avg_rating, total_reviews, view_count, is_featured, created_at, updated_at)
      VALUES (
        gen_random_uuid(), v_store_id, v_cat_id,
        'Rhum Barbancourt 15 ans 700ml', 'rhum-barbancourt-15ans', 'Rhum Barbancourt Reserve Speciale 15 ans, 43%vol',
        3500, 3000, 50, 'PUBLISHED',
        ROUND(v_rating::numeric, 1),
        (floor(random() * 120) + 5)::int,
        (floor(random() * 800) + 20)::int,
        (random() > 0.75),
        NOW(), NOW()
      ) RETURNING id INTO v_prod_id;

      INSERT INTO product_images (id, product_id, url_full, url_medium, url_thumb, public_id, is_primary, sort_order, created_at, updated_at)
      VALUES (gen_random_uuid(), v_prod_id, 'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=700&q=90', 'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=700&q=90', 'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=700&q=90', 'seed_rhum-barbancourt-15ans', true, 0, NOW(), NOW());
    END IF;
  END IF;
END $$;


-- Produit 54: Huile Vegetale Pure 5 Litres
DO $$
DECLARE
  v_store_id  UUID;
  v_cat_id    UUID;
  v_prod_id   UUID;
  v_rating    NUMERIC;
BEGIN
  SELECT st.id INTO v_store_id
  FROM stores st JOIN sellers s ON s.id = st.seller_id
  JOIN users u ON u.id = s.user_id WHERE u.email = 'gonaives.market@dealpam.com' AND st.is_primary = true LIMIT 1;

  SELECT id INTO v_cat_id FROM categories WHERE slug = 'alimentation' LIMIT 1;

  IF v_store_id IS NOT NULL AND v_cat_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM products WHERE slug = 'huile-vegetale-5l') THEN
      v_rating := 3.5 + random() * 1.5;
      INSERT INTO products (id, store_id, category_id, name, slug, description, price, sale_price, stock, status, avg_rating, total_reviews, view_count, is_featured, created_at, updated_at)
      VALUES (
        gen_random_uuid(), v_store_id, v_cat_id,
        'Huile Vegetale Pure 5 Litres', 'huile-vegetale-5l', 'Huile vegetale 5L, friture et assaisonnement',
        1200, 1050, 200, 'PUBLISHED',
        ROUND(v_rating::numeric, 1),
        (floor(random() * 120) + 5)::int,
        (floor(random() * 800) + 20)::int,
        (random() > 0.75),
        NOW(), NOW()
      ) RETURNING id INTO v_prod_id;

      INSERT INTO product_images (id, product_id, url_full, url_medium, url_thumb, public_id, is_primary, sort_order, created_at, updated_at)
      VALUES (gen_random_uuid(), v_prod_id, 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=700&q=90', 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=700&q=90', 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=700&q=90', 'seed_huile-vegetale-5l', true, 0, NOW(), NOW());
    END IF;
  END IF;
END $$;


-- Produit 55: Pate Dentifrice Colgate 200ml
DO $$
DECLARE
  v_store_id  UUID;
  v_cat_id    UUID;
  v_prod_id   UUID;
  v_rating    NUMERIC;
BEGIN
  SELECT st.id INTO v_store_id
  FROM stores st JOIN sellers s ON s.id = st.seller_id
  JOIN users u ON u.id = s.user_id WHERE u.email = 'gonaives.market@dealpam.com' AND st.is_primary = true LIMIT 1;

  SELECT id INTO v_cat_id FROM categories WHERE slug = 'alimentation' LIMIT 1;

  IF v_store_id IS NOT NULL AND v_cat_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM products WHERE slug = 'pate-dentifrice-colgate') THEN
      v_rating := 3.5 + random() * 1.5;
      INSERT INTO products (id, store_id, category_id, name, slug, description, price, sale_price, stock, status, avg_rating, total_reviews, view_count, is_featured, created_at, updated_at)
      VALUES (
        gen_random_uuid(), v_store_id, v_cat_id,
        'Pate Dentifrice Colgate 200ml', 'pate-dentifrice-colgate', 'Colgate blancheur 200ml, triple action, lot de 3',
        450, NULL, 500, 'PUBLISHED',
        ROUND(v_rating::numeric, 1),
        (floor(random() * 120) + 5)::int,
        (floor(random() * 800) + 20)::int,
        (random() > 0.75),
        NOW(), NOW()
      ) RETURNING id INTO v_prod_id;

      INSERT INTO product_images (id, product_id, url_full, url_medium, url_thumb, public_id, is_primary, sort_order, created_at, updated_at)
      VALUES (gen_random_uuid(), v_prod_id, 'https://images.unsplash.com/photo-1559056199-641a0ac8b55e?w=700&q=90', 'https://images.unsplash.com/photo-1559056199-641a0ac8b55e?w=700&q=90', 'https://images.unsplash.com/photo-1559056199-641a0ac8b55e?w=700&q=90', 'seed_pate-dentifrice-colgate', true, 0, NOW(), NOW());
    END IF;
  END IF;
END $$;


-- Produit 56: Reparation iPhone Ecran Casse
DO $$
DECLARE
  v_store_id  UUID;
  v_cat_id    UUID;
  v_prod_id   UUID;
  v_rating    NUMERIC;
BEGIN
  SELECT st.id INTO v_store_id
  FROM stores st JOIN sellers s ON s.id = st.seller_id
  JOIN users u ON u.id = s.user_id WHERE u.email = 'rico.tech@dealpam.com' AND st.is_primary = true LIMIT 1;

  SELECT id INTO v_cat_id FROM categories WHERE slug = 'services' LIMIT 1;

  IF v_store_id IS NOT NULL AND v_cat_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM products WHERE slug = 'reparation-iphone-ecran') THEN
      v_rating := 3.5 + random() * 1.5;
      INSERT INTO products (id, store_id, category_id, name, slug, description, price, sale_price, stock, status, avg_rating, total_reviews, view_count, is_featured, created_at, updated_at)
      VALUES (
        gen_random_uuid(), v_store_id, v_cat_id,
        'Reparation iPhone Ecran Casse', 'reparation-iphone-ecran', 'Remplacement ecran iPhone toutes generations, garantie 3 mois',
        4500, 3800, 999, 'PUBLISHED',
        ROUND(v_rating::numeric, 1),
        (floor(random() * 120) + 5)::int,
        (floor(random() * 800) + 20)::int,
        (random() > 0.75),
        NOW(), NOW()
      ) RETURNING id INTO v_prod_id;

      INSERT INTO product_images (id, product_id, url_full, url_medium, url_thumb, public_id, is_primary, sort_order, created_at, updated_at)
      VALUES (gen_random_uuid(), v_prod_id, 'https://images.unsplash.com/photo-1621905251189-08b1058d8b1d?w=700&q=90', 'https://images.unsplash.com/photo-1621905251189-08b1058d8b1d?w=700&q=90', 'https://images.unsplash.com/photo-1621905251189-08b1058d8b1d?w=700&q=90', 'seed_reparation-iphone-ecran', true, 0, NOW(), NOW());
    END IF;
  END IF;
END $$;


-- Produit 57: Cours Couture Debutant 10h
DO $$
DECLARE
  v_store_id  UUID;
  v_cat_id    UUID;
  v_prod_id   UUID;
  v_rating    NUMERIC;
BEGIN
  SELECT st.id INTO v_store_id
  FROM stores st JOIN sellers s ON s.id = st.seller_id
  JOIN users u ON u.id = s.user_id WHERE u.email = 'jacmel.boutique@dealpam.com' AND st.is_primary = true LIMIT 1;

  SELECT id INTO v_cat_id FROM categories WHERE slug = 'services' LIMIT 1;

  IF v_store_id IS NOT NULL AND v_cat_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM products WHERE slug = 'cours-couture-debutant') THEN
      v_rating := 3.5 + random() * 1.5;
      INSERT INTO products (id, store_id, category_id, name, slug, description, price, sale_price, stock, status, avg_rating, total_reviews, view_count, is_featured, created_at, updated_at)
      VALUES (
        gen_random_uuid(), v_store_id, v_cat_id,
        'Cours Couture Debutant 10h', 'cours-couture-debutant', 'Formation couture 10h, materiel fourni, certificat',
        3500, NULL, 20, 'PUBLISHED',
        ROUND(v_rating::numeric, 1),
        (floor(random() * 120) + 5)::int,
        (floor(random() * 800) + 20)::int,
        (random() > 0.75),
        NOW(), NOW()
      ) RETURNING id INTO v_prod_id;

      INSERT INTO product_images (id, product_id, url_full, url_medium, url_thumb, public_id, is_primary, sort_order, created_at, updated_at)
      VALUES (gen_random_uuid(), v_prod_id, 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=700&q=90', 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=700&q=90', 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=700&q=90', 'seed_cours-couture-debutant', true, 0, NOW(), NOW());
    END IF;
  END IF;
END $$;


-- Produit 58: Installation Windows + Antivirus
DO $$
DECLARE
  v_store_id  UUID;
  v_cat_id    UUID;
  v_prod_id   UUID;
  v_rating    NUMERIC;
BEGIN
  SELECT st.id INTO v_store_id
  FROM stores st JOIN sellers s ON s.id = st.seller_id
  JOIN users u ON u.id = s.user_id WHERE u.email = 'rico.tech@dealpam.com' AND st.is_primary = true LIMIT 1;

  SELECT id INTO v_cat_id FROM categories WHERE slug = 'services' LIMIT 1;

  IF v_store_id IS NOT NULL AND v_cat_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM products WHERE slug = 'install-windows-antivirus') THEN
      v_rating := 3.5 + random() * 1.5;
      INSERT INTO products (id, store_id, category_id, name, slug, description, price, sale_price, stock, status, avg_rating, total_reviews, view_count, is_featured, created_at, updated_at)
      VALUES (
        gen_random_uuid(), v_store_id, v_cat_id,
        'Installation Windows + Antivirus', 'install-windows-antivirus', 'Installation Windows 11 + antivirus, drivers, Office 365',
        2500, NULL, 999, 'PUBLISHED',
        ROUND(v_rating::numeric, 1),
        (floor(random() * 120) + 5)::int,
        (floor(random() * 800) + 20)::int,
        (random() > 0.75),
        NOW(), NOW()
      ) RETURNING id INTO v_prod_id;

      INSERT INTO product_images (id, product_id, url_full, url_medium, url_thumb, public_id, is_primary, sort_order, created_at, updated_at)
      VALUES (gen_random_uuid(), v_prod_id, 'https://images.unsplash.com/photo-1537884944318-390069bb8665?w=700&q=90', 'https://images.unsplash.com/photo-1537884944318-390069bb8665?w=700&q=90', 'https://images.unsplash.com/photo-1537884944318-390069bb8665?w=700&q=90', 'seed_install-windows-antivirus', true, 0, NOW(), NOW());
    END IF;
  END IF;
END $$;

