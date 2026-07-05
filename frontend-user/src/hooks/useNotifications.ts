import { useQuery } from '@tanstack/react-query';
import api from '../api/axios';
import { useAuthStore } from '../store/auth.store';

function hasToken() {
  return typeof window !== 'undefined' && !!localStorage.getItem('accessToken');
}

export function useNotificationCount() {
  const { user } = useAuthStore();
  const { data } = useQuery({
    queryKey: ['notif-count'],
    queryFn:  () => api.get('/notifications').then(r => (r.data as any[]).filter(n => !n.isRead).length),
    enabled:  !!user && hasToken(),
    refetchInterval: 30_000,
    staleTime: 20_000,
  });
  return data ?? 0;
}

export function useWishlistCount() {
  const { user } = useAuthStore();
  const { data } = useQuery({
    queryKey: ['wishlist-count'],
    queryFn:  () => api.get('/wishlist/count').then(r => r.data?.count ?? 0),
    enabled:  !!user && hasToken(),
    staleTime: 60_000,
    refetchOnMount: 'always',
  });
  return data ?? 0;
}
