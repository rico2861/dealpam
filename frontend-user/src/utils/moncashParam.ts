/**
 * Extrait l'identifiant de transaction MonCash d'une query string, tolérant
 * aux variantes de casse/orthographe constatées en production : MonCash a
 * été vu renvoyer "transactionId" (attendu) mais aussi "transactionld"
 * (L minuscule au lieu de I majuscule) selon le chemin de paiement/le compte
 * marchand — un vrai comportement incohérent côté MonCash, pas une faute de
 * frappe de notre côté. On matche donc n'importe quelle clé qui ressemble à
 * "transaction" + "id" (I ou l, n'importe quelle casse) plutôt qu'une seule
 * orthographe exacte.
 */
export function getMoncashTransactionId(search: string): string | null {
  const params = new URLSearchParams(search);

  const exact = params.get('transactionId');
  if (exact) return exact;

  for (const [key, value] of params.entries()) {
    if (/^transaction[il]d$/i.test(key) && value) return value;
  }
  return null;
}

/** Liste des clés à retirer de l'URL une fois l'identifiant lu (toutes les variantes vues). */
export function stripMoncashTransactionParams(params: URLSearchParams): void {
  const toDelete: string[] = [];
  for (const key of params.keys()) {
    if (/^transaction[il]d$/i.test(key)) toDelete.push(key);
  }
  toDelete.forEach((key) => params.delete(key));
}
