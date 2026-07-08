// Prix dégressifs par palier de quantité (bundles) — utilisé partout où un prix
// produit doit être calculé pour une quantité donnée (panier, commande).
//
// IMPORTANT : `tier.price` est le prix TOTAL du forfait pour `tier.minQty`
// unités (ex: "3 pour 2500 gdes au lieu de 3000"), jamais un prix unitaire.
// Le taux unitaire effectif d'un palier = tier.price / tier.minQty, appliqué
// à la quantité réelle commandée. Le palier appliqué est celui du plus grand
// minQty <= quantité commandée ; en dessous du premier palier, on retombe sur
// le prix normal/promo.
export function getEffectiveUnitPrice(
  price: number,
  salePrice: number | null | undefined,
  priceTiersJson: string | null | undefined,
  qty: number,
): number {
  const base = salePrice != null && Number(salePrice) > 0 ? Number(salePrice) : Number(price);
  if (!priceTiersJson) return base;

  let tiers: { minQty: number; price: number }[];
  try { tiers = JSON.parse(priceTiersJson); } catch { return base; }
  if (!Array.isArray(tiers) || tiers.length === 0) return base;

  const applicable = tiers
    .filter(t => qty >= t.minQty && t.minQty > 0)
    .sort((a, b) => b.minQty - a.minQty)[0];

  return applicable ? Number(applicable.price) / applicable.minQty : base;
}
