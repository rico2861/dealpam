// Identifiant anonyme persistant (localStorage) utilisé UNIQUEMENT pour dédupliquer
// le compteur de vues produit côté backend (ne pas recompter la même personne qui
// rafraîchit la page plusieurs fois) — voir ProductsService.registerView.
const KEY = 'dp_viewer_id';

export function getViewerId(): string {
  let id = localStorage.getItem(KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(KEY, id);
  }
  return id;
}
