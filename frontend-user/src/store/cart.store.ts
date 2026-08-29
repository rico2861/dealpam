import { create } from 'zustand';
import api from '../api/axios';
import { getGuestCartCount } from '../utils/cart';

interface CartState {
  count: number;
  setCount: (n: number) => void;
  fetchCount: () => Promise<void>;
}

export const useCartStore = create<CartState>((set) => ({
  count: 0,
  setCount: (count) => set({ count }),
  fetchCount: async () => {
    // Visiteur non connecté : le panier vit en localStorage, pas d'appel serveur.
    if (!localStorage.getItem('accessToken')) {
      set({ count: getGuestCartCount() });
      return;
    }
    try {
      const { data } = await api.get('/cart');
      set({ count: data.items?.length || 0 });
    } catch {
      // Ne jamais laisser le badge sur une valeur périmée en cas d'échec réseau
      // transitoire (ex: juste après une grosse transaction de commande) —
      // un seul retry silencieux avant d'abandonner pour de bon.
      try {
        const { data } = await api.get('/cart');
        set({ count: data.items?.length || 0 });
      } catch {}
    }
  },
}));
