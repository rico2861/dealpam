import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { io } from 'socket.io-client';
import api from '../api/axios';
import { useAuthStore } from '../store/auth.store';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

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

// Nombre total de messages non lus (acheteur, vendeur ou admin — le compte
// est identique cote backend, seul le libelle du lien change selon le role).
// Mis a jour en temps reel via socket (pas seulement du polling) : des qu'un
// nouveau message arrive sur n'importe quelle conversation, le badge se
// rafraichit immediatement au lieu d'attendre le prochain interval.
export function useUnreadMessagesCount() {
  const { user } = useAuthStore();
  const qc = useQueryClient();
  const enabled = !!user && hasToken();

  const { data } = useQuery({
    queryKey: ['chat-unread-count'],
    queryFn:  () => api.get('/chat/unread-count').then(r => Number(r.data) || 0),
    enabled,
    staleTime: 20_000,
    refetchInterval: 30_000,
  });

  useEffect(() => {
    if (!enabled) return;
    const socket = io(`${API_URL.replace('/v1', '')}/chat`, {
      auth: (cb: (o: object) => void) => cb({ token: localStorage.getItem('accessToken') }),
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5,
    });
    // Ce socket ne rejoint aucune room 'conv:${id}' (il ne sert qu'a ce badge),
    // seule la room personnelle 'user:${id}' (auto-rejointe a la connexion
    // cote gateway) recoit 'chat:unread-changed' — voir chat.gateway.ts.
    const refresh = () => qc.invalidateQueries({ queryKey: ['chat-unread-count'] });
    socket.on('chat:unread-changed', refresh);
    return () => { socket.disconnect(); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);

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
