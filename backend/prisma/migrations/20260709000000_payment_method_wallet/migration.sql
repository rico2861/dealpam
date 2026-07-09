-- Ajoute la valeur WALLET à l'enum PaymentMethod (paiement d'abonnement via le solde wallet du vendeur)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'WALLET'
      AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'PaymentMethod')
  ) THEN
    ALTER TYPE "PaymentMethod" ADD VALUE 'WALLET';
  END IF;
END $$;
