import api from '../api/axios';

// Panier invité : stocké en localStorage tant que l'utilisateur n'est pas
// connecté (POST /cart/items exige un JWT côté backend). Fusionné dans le
// panier serveur dès la connexion, puis vidé — voir mergeGuestCartOnLogin().
const GUEST_CART_KEY = 'dp-guest-cart';

export interface GuestCartItem {
  productId: string;
  quantity: number;
  color?: string;
  size?: string;
  variantId?: string;
  offeredPrice?: number;
  // Copie légère des infos produit au moment de l'ajout — évite un aller-retour
  // API supplémentaire pour afficher le panier invité (pas de session pour
  // demander /cart en lot côté serveur, donc rien à hydrater depuis l'API).
  snapshot?: { name: string; slug: string; image: string; price: number; salePrice?: number | null; storeName?: string };
}

function readGuestCart(): GuestCartItem[] {
  try {
    const raw = localStorage.getItem(GUEST_CART_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch { return []; }
}

function writeGuestCart(items: GuestCartItem[]) {
  localStorage.setItem(GUEST_CART_KEY, JSON.stringify(items));
}

export function getGuestCart(): GuestCartItem[] {
  return readGuestCart();
}

export function getGuestCartCount(): number {
  return readGuestCart().length;
}

function sameLine(a: GuestCartItem, b: Omit<GuestCartItem, 'quantity'>) {
  return a.productId === b.productId && a.color === b.color && a.size === b.size && a.variantId === b.variantId;
}

export function addToGuestCart(item: GuestCartItem) {
  const items = readGuestCart();
  const existing = items.find((i) => sameLine(i, item));
  if (existing && item.offeredPrice == null) {
    existing.quantity += item.quantity;
  } else {
    items.push(item);
  }
  writeGuestCart(items);
  return items;
}

export function updateGuestCartQuantity(index: number, quantity: number) {
  const items = readGuestCart();
  if (items[index]) items[index].quantity = quantity;
  writeGuestCart(items);
  return items;
}

export function removeFromGuestCart(index: number) {
  const items = readGuestCart();
  items.splice(index, 1);
  writeGuestCart(items);
  return items;
}

export function clearGuestCart() {
  localStorage.removeItem(GUEST_CART_KEY);
}

// Ajoute au panier serveur si connecté, sinon au panier local (localStorage).
export async function addToCart(item: GuestCartItem, isAuthenticated: boolean) {
  if (isAuthenticated) {
    const { snapshot, ...payload } = item;
    await api.post('/cart/items', payload);
  } else {
    addToGuestCart(item);
  }
}

// Appelé juste après une connexion réussie : envoie chaque ligne du panier
// invité au panier serveur puis vide le stockage local. Les échecs individuels
// (ex: produit retiré depuis) sont ignorés silencieusement — pas bloquant.
export async function mergeGuestCartOnLogin() {
  const items = readGuestCart();
  if (!items.length) return;
  await Promise.all(items.map(({ snapshot, ...item }) => api.post('/cart/items', item).catch(() => {})));
  clearGuestCart();
}
