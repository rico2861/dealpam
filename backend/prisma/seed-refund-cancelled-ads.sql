-- Rembourse retroactivement les campagnes pub annulees AVANT le lancement,
-- payees par Wallet, dont le budget non consomme n'a jamais ete recredite
-- (bug corrige dans le code — ce script rattrape les cas passes uniquement).
-- Idempotent : ne rembourse jamais deux fois une meme campagne (verifie
-- l'absence d'une transaction REFUND déjà existante avec reference = campaign.id).
DO $$
DECLARE
  camp RECORD;
  wallet_id_var TEXT;
  new_balance FLOAT;
  refund_amount NUMERIC;
BEGIN
  FOR camp IN
    SELECT ac.id, ac.seller_id, ac.name, ac.total_budget, ac.spent
    FROM ad_campaigns ac
    WHERE ac.status = 'CANCELLED'
      AND ac.payment_id IS NULL
      AND ac.total_budget > ac.spent
      AND NOT EXISTS (
        SELECT 1 FROM wallet_transactions wt
        WHERE wt.reference = ac.id AND wt.type = 'REFUND'
      )
  LOOP
    refund_amount := camp.total_budget - camp.spent;

    SELECT id INTO wallet_id_var FROM seller_wallets WHERE seller_id = camp.seller_id;
    IF wallet_id_var IS NULL THEN
      CONTINUE;
    END IF;

    UPDATE seller_wallets SET balance = balance + refund_amount WHERE id = wallet_id_var
      RETURNING balance INTO new_balance;

    INSERT INTO wallet_transactions (id, wallet_id, type, amount, balance_after, description, reference, status, created_at)
    VALUES (
      gen_random_uuid(), wallet_id_var, 'REFUND', refund_amount, new_balance,
      'Remboursement retroactif — campagne "' || camp.name || '" annulee (budget non utilise, rattrapage bug)',
      camp.id, 'COMPLETED', now()
    );

    RAISE NOTICE 'Rembourse % HTG pour campagne % (seller %)', refund_amount, camp.name, camp.seller_id;
  END LOOP;
END $$;
