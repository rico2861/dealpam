-- Le paiement MonCash d'une commande est desormais verifie AVANT toute
-- creation de commande : on stocke temporairement les donnees de checkout
-- (adresse, livraison, notes) sur le Payment en attente, la commande reelle
-- n'est creee qu'une fois le paiement confirme cote MonCash.
ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "order_payload" JSONB;
ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "order_user_id" TEXT;
