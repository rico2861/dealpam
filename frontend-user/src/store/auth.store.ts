import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import api from '../api/axios';

interface User { id: string; email: string; firstName: string; lastName: string; role: string; avatar?: string; department?: string; city?: string; }
interface AuthState {
  user: User | null;
  accessToken: string | null;
  setUser: (user: User, token: string, refresh: string) => void;
  logout: () => void;
  updateUser: (u: Partial<User>) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
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
      },
      updateUser: (u) => set((s) => ({ user: s.user ? { ...s.user, ...u } : null })),
    }),
    { name: 'auth-store', partialize: (s) => ({ user: s.user }) }
  )
);
