// Déclenche l'animation "vol vers le panier" (voir FlyToCartLayer.tsx) depuis
// n'importe quelle page — découplé via un simple CustomEvent puisque le bouton
// d'ajout (page produit) et l'icône panier (Header) ne partagent aucun parent
// direct proche dans l'arbre de composants.
export function triggerFlyToCart(sourceEl: HTMLElement | null, imageUrl?: string) {
  if (!sourceEl) return;
  const rect = sourceEl.getBoundingClientRect();
  window.dispatchEvent(new CustomEvent('dp:fly-to-cart', { detail: { rect, imageUrl } }));
}
