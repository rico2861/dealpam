-- À exécuter manuellement dans l'éditeur SQL de Supabase, APRÈS
-- manual_order_item_product_nullable.sql.
--
-- Corrige les autres contraintes qui empêchaient encore de supprimer
-- définitivement un produit/service sans commande active : le panier et les
-- favoris n'ont aucune valeur historique (cascade), les avis et rendez-vous
-- doivent survivre à la suppression du produit (SetNull — leur contenu utile
-- est déjà dénormalisé : review.rating/comment, appointment.service_name_snapshot).

-- cart_items : suppression en cascade (un panier n'est jamais historique)
ALTER TABLE "cart_items" DROP CONSTRAINT IF EXISTS "cart_items_product_id_fkey";
ALTER TABLE "cart_items"
  ADD CONSTRAINT "cart_items_product_id_fkey"
  FOREIGN KEY ("product_id") REFERENCES "products"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- wishlist_items : suppression en cascade (idem, simple favori)
ALTER TABLE "wishlist_items" DROP CONSTRAINT IF EXISTS "wishlist_items_product_id_fkey";
ALTER TABLE "wishlist_items"
  ADD CONSTRAINT "wishlist_items_product_id_fkey"
  FOREIGN KEY ("product_id") REFERENCES "products"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- reviews : product_id passe à NULL au lieu de bloquer (l'avis reste affiché)
ALTER TABLE "reviews" DROP CONSTRAINT IF EXISTS "reviews_product_id_fkey";
ALTER TABLE "reviews"
  ADD CONSTRAINT "reviews_product_id_fkey"
  FOREIGN KEY ("product_id") REFERENCES "products"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- appointments : nouvelle colonne pour garder le nom du service affiché
-- même après suppression du produit, puis product_id devient optionnel.
ALTER TABLE "appointments" ADD COLUMN IF NOT EXISTS "service_name_snapshot" TEXT;
ALTER TABLE "appointments" ALTER COLUMN "product_id" DROP NOT NULL;
ALTER TABLE "appointments" DROP CONSTRAINT IF EXISTS "appointments_product_id_fkey";
ALTER TABLE "appointments"
  ADD CONSTRAINT "appointments_product_id_fkey"
  FOREIGN KEY ("product_id") REFERENCES "products"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- Remplit service_name_snapshot pour les rendez-vous déjà existants, à partir
-- du nom actuel du produit lié (uniquement pour les lignes qui n'ont pas
-- encore de valeur — les nouveaux rendez-vous la reçoivent déjà à la création).
UPDATE "appointments" a
SET "service_name_snapshot" = p."name"
FROM "products" p
WHERE a."product_id" = p."id" AND a."service_name_snapshot" IS NULL;
