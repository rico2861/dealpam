-- ============================================================
-- DealPam Seed SQL — coller dans Supabase Dashboard > SQL Editor
-- ============================================================

-- Categories
INSERT INTO categories (id, name, slug, sort_order, is_active, created_at, updated_at)
VALUES
  (gen_random_uuid(), 'Smartphones',  'smartphones',  1,  true, NOW(), NOW()),
  (gen_random_uuid(), 'Vehicules',    'vehicules',    2,  true, NOW(), NOW()),
  (gen_random_uuid(), 'Meubles',      'meubles',      3,  true, NOW(), NOW()),
  (gen_random_uuid(), 'Vetements',    'vetements',    4,  true, NOW(), NOW()),
  (gen_random_uuid(), 'Electronique', 'electronique', 5,  true, NOW(), NOW()),
  (gen_random_uuid(), 'Maison',       'maison',       6,  true, NOW(), NOW()),
  (gen_random_uuid(), 'Beaute',       'beaute',       7,  true, NOW(), NOW()),
  (gen_random_uuid(), 'Chaussures',   'chaussures',   8,  true, NOW(), NOW()),
  (gen_random_uuid(), 'Sport',        'sport',        9,  true, NOW(), NOW()),
  (gen_random_uuid(), 'Alimentation', 'alimentation', 10, true, NOW(), NOW()),
  (gen_random_uuid(), 'Services',     'services',     11, true, NOW(), NOW())
ON CONFLICT (slug) DO NOTHING;

-- Admin user
INSERT INTO users (id, email, username, password_hash, first_name, last_name, role, is_email_verified, is_active, created_at, updated_at)
VALUES (gen_random_uuid(), 'admin@dealpam.com', 'admin_dealpam', '$2b$10$25L4/6iuCLjoNWr44DgWhu7oO1eDLBmQCBUSiAgC.Iw3Ye3QzE8Se', 'Admin', 'DealPam', 'ADMIN', true, true, NOW(), NOW())
ON CONFLICT (email) DO NOTHING;

-- Test client
INSERT INTO users (id, email, username, password_hash, first_name, last_name, role, is_email_verified, is_active, city, department, created_at, updated_at)
VALUES (gen_random_uuid(), 'client@dealpam.com', 'jean_client', '$2b$10$atGuQIRApEnhdBUBjdeK8egS1j.USLE1NOgRYWtlnZCqnJf8eCaDy', 'Jean', 'Pierre', 'CUSTOMER', true, true, 'Port-au-Prince', 'Ouest', NOW(), NOW())
ON CONFLICT (email) DO NOTHING;

-- Sellers (6 villes differentes)
INSERT INTO users (id, email, username, password_hash, first_name, last_name, role, is_email_verified, is_active, phone, city, department, avatar, created_at, updated_at)
VALUES
  (gen_random_uuid(), 'rico.tech@dealpam.com',          'rico_tech',        '$2b$10$HXAjS4LespMJ9Ns4VasZ5u0AUUv1TK0OvHfoRvfvfGRxleYthohiS', 'Rico',         'Brezault',  'SELLER', true, true, '+50937000001', 'Port-au-Prince', 'Ouest',      'https://randomuser.me/api/portraits/men/32.jpg',   NOW(), NOW()),
  (gen_random_uuid(), 'mode.chic@dealpam.com',          'mode_chic',        '$2b$10$HXAjS4LespMJ9Ns4VasZ5u0AUUv1TK0OvHfoRvfvfGRxleYthohiS', 'Marie',        'Chantal',   'SELLER', true, true, '+50937000002', 'Cap-Haitien',    'Nord',       'https://randomuser.me/api/portraits/women/44.jpg', NOW(), NOW()),
  (gen_random_uuid(), 'auto.plus@dealpam.com',          'auto_plus',        '$2b$10$HXAjS4LespMJ9Ns4VasZ5u0AUUv1TK0OvHfoRvfvfGRxleYthohiS', 'Pierre',       'Dupont',    'SELLER', true, true, '+50937000003', 'Petionville',    'Ouest',      'https://randomuser.me/api/portraits/men/55.jpg',   NOW(), NOW()),
  (gen_random_uuid(), 'gonaives.market@dealpam.com',    'gonaives_market',  '$2b$10$HXAjS4LespMJ9Ns4VasZ5u0AUUv1TK0OvHfoRvfvfGRxleYthohiS', 'Josette',      'Francois',  'SELLER', true, true, '+50937000004', 'Gonaives',       'Artibonite', 'https://randomuser.me/api/portraits/women/68.jpg', NOW(), NOW()),
  (gen_random_uuid(), 'cayes.shop@dealpam.com',         'cayes_shop',       '$2b$10$HXAjS4LespMJ9Ns4VasZ5u0AUUv1TK0OvHfoRvfvfGRxleYthohiS', 'Jean-Baptiste','Louis',     'SELLER', true, true, '+50937000005', 'Les Cayes',      'Sud',        'https://randomuser.me/api/portraits/men/77.jpg',   NOW(), NOW()),
  (gen_random_uuid(), 'jacmel.boutique@dealpam.com',    'jacmel_boutique',  '$2b$10$HXAjS4LespMJ9Ns4VasZ5u0AUUv1TK0OvHfoRvfvfGRxleYthohiS', 'Nadine',       'Beaumont',  'SELLER', true, true, '+50937000006', 'Jacmel',         'Sud-Est',    'https://randomuser.me/api/portraits/women/90.jpg', NOW(), NOW())
ON CONFLICT (email) DO NOTHING;

-- Sellers table (references users)
INSERT INTO sellers (id, user_id, status, business_city, business_dept, created_at, updated_at)
SELECT gen_random_uuid(), u.id, 'APPROVED',
  CASE u.email
    WHEN 'rico.tech@dealpam.com'       THEN 'Port-au-Prince'
    WHEN 'mode.chic@dealpam.com'       THEN 'Cap-Haitien'
    WHEN 'auto.plus@dealpam.com'       THEN 'Petionville'
    WHEN 'gonaives.market@dealpam.com' THEN 'Gonaives'
    WHEN 'cayes.shop@dealpam.com'      THEN 'Les Cayes'
    WHEN 'jacmel.boutique@dealpam.com' THEN 'Jacmel'
  END,
  CASE u.email
    WHEN 'rico.tech@dealpam.com'       THEN 'Ouest'
    WHEN 'mode.chic@dealpam.com'       THEN 'Nord'
    WHEN 'auto.plus@dealpam.com'       THEN 'Ouest'
    WHEN 'gonaives.market@dealpam.com' THEN 'Artibonite'
    WHEN 'cayes.shop@dealpam.com'      THEN 'Sud'
    WHEN 'jacmel.boutique@dealpam.com' THEN 'Sud-Est'
  END,
  NOW(), NOW()
FROM users u
WHERE u.email IN (
  'rico.tech@dealpam.com','mode.chic@dealpam.com','auto.plus@dealpam.com',
  'gonaives.market@dealpam.com','cayes.shop@dealpam.com','jacmel.boutique@dealpam.com'
)
AND NOT EXISTS (SELECT 1 FROM sellers s WHERE s.user_id = u.id);

-- Stores
INSERT INTO stores (id, seller_id, name, slug, store_code, is_primary, is_active, is_verified, city, department, logo_url, description, avg_rating, created_at, updated_at)
SELECT
  gen_random_uuid(), s.id,
  CASE u.email
    WHEN 'rico.tech@dealpam.com'       THEN 'Rico Tech Store'
    WHEN 'mode.chic@dealpam.com'       THEN 'Mode Chic Haiti'
    WHEN 'auto.plus@dealpam.com'       THEN 'Auto Plus Haiti'
    WHEN 'gonaives.market@dealpam.com' THEN 'Marche Gonaives'
    WHEN 'cayes.shop@dealpam.com'      THEN 'Les Cayes Shop'
    WHEN 'jacmel.boutique@dealpam.com' THEN 'Jacmel Boutique'
  END,
  CASE u.email
    WHEN 'rico.tech@dealpam.com'       THEN 'rico-tech-store'
    WHEN 'mode.chic@dealpam.com'       THEN 'mode-chic-haiti'
    WHEN 'auto.plus@dealpam.com'       THEN 'auto-plus-haiti'
    WHEN 'gonaives.market@dealpam.com' THEN 'marche-gonaives'
    WHEN 'cayes.shop@dealpam.com'      THEN 'les-cayes-shop'
    WHEN 'jacmel.boutique@dealpam.com' THEN 'jacmel-boutique'
  END,
  CASE u.email
    WHEN 'rico.tech@dealpam.com'       THEN 'SHOP-0001'
    WHEN 'mode.chic@dealpam.com'       THEN 'SHOP-0002'
    WHEN 'auto.plus@dealpam.com'       THEN 'SHOP-0003'
    WHEN 'gonaives.market@dealpam.com' THEN 'SHOP-0004'
    WHEN 'cayes.shop@dealpam.com'      THEN 'SHOP-0005'
    WHEN 'jacmel.boutique@dealpam.com' THEN 'SHOP-0006'
  END,
  true, true, true,
  s.business_city, s.business_dept,
  CASE u.email
    WHEN 'rico.tech@dealpam.com'       THEN 'https://images.unsplash.com/photo-1611532736597-de2d4265fba3?w=200&q=80'
    WHEN 'mode.chic@dealpam.com'       THEN 'https://images.unsplash.com/photo-1445205170230-053b83016050?w=200&q=80'
    WHEN 'auto.plus@dealpam.com'       THEN 'https://images.unsplash.com/photo-1568844293986-ca047e3d0e7e?w=200&q=80'
    WHEN 'gonaives.market@dealpam.com' THEN 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=200&q=80'
    WHEN 'cayes.shop@dealpam.com'      THEN 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=200&q=80'
    WHEN 'jacmel.boutique@dealpam.com' THEN 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=200&q=80'
  END,
  'Boutique officielle sur DealPam',
  4.2 + random() * 0.8,
  NOW(), NOW()
FROM sellers s
JOIN users u ON u.id = s.user_id
WHERE u.email IN (
  'rico.tech@dealpam.com','mode.chic@dealpam.com','auto.plus@dealpam.com',
  'gonaives.market@dealpam.com','cayes.shop@dealpam.com','jacmel.boutique@dealpam.com'
)
AND NOT EXISTS (
  SELECT 1 FROM stores st WHERE st.seller_id = s.id
);

