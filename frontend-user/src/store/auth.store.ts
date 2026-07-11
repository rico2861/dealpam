import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import api from '../api/axios';

interface User { id: string; email: string; firstName: string; lastName: string; role: string; avatar?: string; department?: string; city?: string; username?: string; }
interface AuthState {
  user: User | null;
  accessToken: string | null;
  // La réhydratation depuis localStorage se fait de façon asynchrone (même pour
  // un storage synchrone comme localStorage — zustand/persist passe toujours par
  // un microtask). Sans ce flag, tout composant qui lit `user` au premier rendu
  // après un refresh le voit encore à `null` pendant un instant — d'où le flash
  // de mauvais contenu (redirection vers /login, mauvais layout, requêtes
  // "enabled: !!user" qui démarrent en retard) avant que la vraie session ne
  // s'affiche. Voir App.tsx qui bloque le rendu tant que hasHydrated est false.
  hasHydrated: boolean;
  setUser: (user: User, token: string, refresh: string) => void;
  logout: () => void;
  updateUser: (u: Partial<User>) => void;
  refreshProfile: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      hasHydrated: false,
      setUser: (user, accessToken, refreshToken) => {
        localStorage.setItem('accessToken', accessToken);
        localStorage.setItem('refreshToken', refreshToken);
        set({ user, accessToken });
      },
      logout: async () => {
        const r = localStorage.getItem('refreshToken');
        if (r) try { await api.post('/auth/logout', { refreshToken: r }); } catch {}
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        set({ user: null, accessToken: null });
        // Vide tout cache Workbox lié à l'API — évite qu'un autre compte
        // connecté ensuite sur cet appareil hérite de données mises en cache
        // pour ce compte-ci (voir vite.config.ts pour le détail du bug).
        if ('caches' in window) {
          try {
            const keys = await caches.keys();
            await Promise.all(keys.filter((k) => k.startsWith('api-')).map((k) => caches.delete(k)));
          } catch {}
        }
      },
      updateUser: (u) => set((s) => ({ user: s.user ? { ...s.user, ...u } : null })),
      refreshProfile: async () => {
        const token = localStorage.getItem('accessToken');
        if (!token) return;
        try {
          const { data } = await api.get('/users/me');
          // data contains id, email, role, firstName, lastName, etc.
          set((s) => ({
            user: s.user
              ? { ...s.user, role: data.role, avatar: data.avatar, firstName: data.firstName, lastName: data.lastName, city: data.city, username: data.username }
              : s.user,
          }));
        } catch {
          // token expired or invalid — swallow silently, user stays logged in with cached data
        }
      },
    }),
    {
      name: 'auth-store',
      partialize: (s) => ({ user: s.user }),
      // Se déclenche une fois la lecture de localStorage terminée (succès ou échec) —
      // c'est le seul signal fiable que `user` reflète enfin la vraie session.
      onRehydrateStorage: () => () => {
        useAuthStore.setState({ hasHydrated: true });
      },
    }
  )
);
