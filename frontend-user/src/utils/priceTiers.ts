// Miroir de backend/src/modules/products/price-tiers.util.ts — même logique
// de calcul du prix effectif selon la quantité (paliers de prix dégressifs).
export interface PriceTier { minQty: number; price: number }

export function parsePriceTiers(raw?: string | null): PriceTier[] {
  if (!raw) return [];
  try {
    const tiers = JSON.parse(raw);
    return Array.isArray(tiers) ? tiers : [];
  } catch { return []; }
}

export function getEffectiveUnitPrice(
  price: number,
  salePrice: number | null | undefined,
  priceTiersJson: string | null | undefined,
  qty: number,
): number {
  const base = salePrice != null && Number(salePrice) > 0 ? Number(salePrice) : Number(price);
  const tiers = parsePriceTiers(priceTiersJson);
  if (tiers.length === 0) return base;
  const applicable = tiers.filter(t => qty >= t.minQty).sort((a, b) => b.minQty - a.minQty)[0];
  return applicable ? Number(applicable.price) : base;
}
