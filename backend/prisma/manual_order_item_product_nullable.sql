-- À exécuter manuellement dans l'éditeur SQL de Supabase.
-- Rend order_items.product_id optionnel (ON DELETE SET NULL) pour permettre
-- de supprimer définitivement un produit qui n'a plus de commande active,
-- sans casser l'historique des commandes déjà livrées/annulées/remboursées
-- (productName/imageUrl/unitPrice/subtotal restent stockés sur order_items,
-- indépendamment de product_id).

ALTER TABLE "order_items" ALTER COLUMN "product_id" DROP NOT NULL;

ALTER TABLE "order_items" DROP CONSTRAINT IF EXISTS "order_items_product_id_fkey";

ALTER TABLE "order_items"
  ADD CONSTRAINT "order_items_product_id_fkey"
  FOREIGN KEY ("product_id") REFERENCES "products"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
