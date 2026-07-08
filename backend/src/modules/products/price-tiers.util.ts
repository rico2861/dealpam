// Prix dégressifs par palier de quantité (bundles) — utilisé partout où un prix
// produit doit être calculé pour une quantité donnée (panier, commande).
// Le palier appliqué est celui du plus grand minQty <= quantité commandée ;
// en dessous du premier palier, on retombe sur le prix normal/promo.
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
    .filter(t => qty >= t.minQty)
    .sort((a, b) => b.minQty - a.minQty)[0];

  return applicable ? Number(applicable.price) : base;
}
