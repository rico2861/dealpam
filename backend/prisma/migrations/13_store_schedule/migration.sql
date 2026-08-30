-- Le formulaire "Configurer la boutique" (StoreForm) envoie toujours le champ
-- "schedule" (horaires d'ouverture) dans le meme PATCH que tous les autres
-- onglets (paiement, livraison...), meme quand seul un autre onglet a ete
-- modifie. Sans cette colonne, Prisma rejetait TOUTE la requete de mise a
-- jour ("Unknown argument schedule") -- cause probable du bug historique
-- "la partie paiement ne sauvegarde pas" (l'onglet paiement echouait a cause
-- d'un champ totalement different dans le meme payload).
ALTER TABLE "stores" ADD COLUMN IF NOT EXISTS "schedule" TEXT;
