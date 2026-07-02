import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import api from '../api/axios';

interface Admin {
  id: string; email: string; firstName: string; lastName: string;
  role: string; mustChangePassword?: boolean;
}
interface AdminState {
  admin: Admin | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  clearMustChange: () => void;
}

export const useAdminStore = create<AdminState>()(
  persist(
    (set) => ({
      admin: null,
      login: async (email, password) => {
        const { data } = await api.post('/auth/login', { identifier: email, password, clientType: 'admin' });
        const allowed = ['ADMIN', 'SUPER_ADMIN', 'MODERATOR', 'CUSTOMER_CARE', 'PARTNER', 'ACCOUNTANT'];
        if (!allowed.includes(data.user.role)) throw new Error('Accès réservé aux membres de l\'équipe DealPam');
        localStorage.setItem('admin_token', data.accessToken);
        set({ admin: data.user });
      },
      logout: () => {
        localStorage.removeItem('admin_token');
        set({ admin: null });
      },
      clearMustChange: () => set(s => s.admin ? { admin: { ...s.admin, mustChangePassword: false } } : {}),
    }),
    { name: 'admin-store', partialize: (s) => ({ admin: s.admin }) }
  )
);
