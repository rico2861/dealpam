import { QueryClient } from '@tanstack/react-query';

// Instance partagée — doit être importable en dehors de l'arbre React (ex:
// auth.store.ts) pour pouvoir vider le cache au login/logout. Voir main.tsx
// pour le QueryClientProvider qui l'utilise.
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30 * 1000,
      gcTime:    30 * 60 * 1000,
      retry: false,
    },
  },
});
