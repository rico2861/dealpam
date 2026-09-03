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

const VERIFY_PENDING_KEY = 'moncashVerifyPending';
// Le flag doit normalement être nettoyé par MoncashReturnHandler une fois la
// vérification terminée (succès, échec ou exception) — mais s'il reste
// bloqué à '1' pour une raison quelconque (onglet fermé/rechargé en plein
// milieu, exception avant le `finally`...), sessionStorage le garde pour
// TOUTE la durée de vie de l'onglet, ce qui bloquerait indéfiniment la home
// sur l'écran de vérification (vu en prod : impossible de se connecter,
// coincé sur cet écran). On horodate le flag et on l'ignore passé ce délai.
const VERIFY_PENDING_MAX_AGE_MS = 30_000;

export function setMoncashVerifyPending(): void {
  try { sessionStorage.setItem(VERIFY_PENDING_KEY, String(Date.now())); } catch { /* ignore */ }
}

export function clearMoncashVerifyPending(): void {
  try { sessionStorage.removeItem(VERIFY_PENDING_KEY); } catch { /* ignore */ }
}

export function isMoncashVerifyPending(): boolean {
  let raw: string | null = null;
  try { raw = sessionStorage.getItem(VERIFY_PENDING_KEY); } catch { return false; }
  if (!raw) return false;
  const setAt = Number(raw);
  if (!Number.isFinite(setAt) || Date.now() - setAt > VERIFY_PENDING_MAX_AGE_MS) {
    clearMoncashVerifyPending();
    return false;
  }
  return true;
}
