-- Un vendeur peut avoir plusieurs comptes bancaires (banques differentes) --
-- remplace les colonnes bank_name/bank_account_name/bank_account_number
-- (un seul compte) par un tableau JSON, sans les supprimer pour compatibilite.
ALTER TABLE "stores" ADD COLUMN IF NOT EXISTS "bank_accounts" TEXT;
