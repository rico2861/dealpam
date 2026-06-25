import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import api from '../api/axios';

interface Admin { id: string; email: string; firstName: string; lastName: string; role: string; }
interface AdminState {
  admin: Admin | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

export const useAdminStore = create<AdminState>()(
  persist(
    (set) => ({
      admin: null,
      login: async (email, password) => {
        const { data } = await api.post('/auth/login', { email, password });
        const allowed = ['ADMIN', 'SUPER_ADMIN', 'MODERATOR'];
        if (!allowed.includes(data.user.role)) throw new Error('Accès réservé aux administrateurs');
        localStorage.setItem('admin_token', data.accessToken);
        set({ admin: data.user });
      },
      logout: () => {
        localStorage.removeItem('admin_token');
        set({ admin: null });
      },
    }),
    { name: 'admin-store', partialize: (s) => ({ admin: s.admin }) }
  )
);
