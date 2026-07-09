-- Nettoyage ponctuel : l'ancien système "modification en attente de validation"
-- (has_pending_edit / pending_changes) n'est plus utilisé — les éditions de
-- produits publiés s'appliquent désormais immédiatement. Les produits édités
-- avant ce changement pouvaient rester bloqués à has_pending_edit = true pour
-- toujours, affichant un bandeau "modification en attente" qui ne se résorbait
-- jamais côté vendeur, et une file "Modifications en attente" toujours vide
-- côté admin (fonctionnalité désormais supprimée).
UPDATE products
SET has_pending_edit = false,
    pending_changes = NULL,
    pending_rejection_reason = NULL
WHERE has_pending_edit = true;
