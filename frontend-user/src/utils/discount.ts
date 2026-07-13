// Calcul du pourcentage de réduction affiché sur les cartes produit — logique
// dupliquée indépendamment dans plusieurs pages (ProductDetailPage, HomePage,
// BoutiquePage), avec un risque de divergence si la règle d'arrondi change
// dans un fichier sans être répercutée dans les autres.
export function discountPercent(price: number | string | null | undefined, salePrice: number | string | null | undefined): number {
  const p  = Number(price);
  const sp = Number(salePrice);
  if (!salePrice || !(sp < p) || !p) return 0;
  return Math.round((1 - sp / p) * 100);
}
