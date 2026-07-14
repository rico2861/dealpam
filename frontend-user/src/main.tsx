import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SnackbarProvider } from 'notistack';
import CustomSnackbar from './components/shared/CustomSnackbar';
import ErrorBoundary from './components/shared/ErrorBoundary';
import { ThemeProvider, CssBaseline, useMediaQuery } from '@mui/material';
import App from './App';
import theme from './theme';
import './index.css';

// Sur mobile, "bottom-right" chevauche la barre de navigation fixe et le bouton
// de chat flottant — on affiche donc les notifications en haut, centrées, en dessous
// de 600px, et on garde le classique bas-droite sur desktop.
function AppSnackbarProvider({ children }: { children: React.ReactNode }) {
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'), { noSsr: true });
  return (
    <SnackbarProvider
      maxSnack={3}
      anchorOrigin={isMobile ? { vertical: 'top', horizontal: 'center' } : { vertical: 'bottom', horizontal: 'right' }}
      Components={{ success: CustomSnackbar, error: CustomSnackbar, info: CustomSnackbar, warning: CustomSnackbar }}
    >
      {children}
    </SnackbarProvider>
  );
}

// Purge les anciens caches Workbox 'api-*' d'appareils déjà affectés par le bug
// où les réponses /v1/* étaient mises en cache par URL sans tenir compte du
// compte connecté (fuite de données entre comptes). Un simple refresh ne les
// vide pas de lui-même — nettoyage fait une fois au démarrage de l'app.
if ('caches' in window) {
  caches.keys().then((keys) => {
    keys.filter((k) => k.startsWith('api-')).forEach((k) => caches.delete(k));
  }).catch(() => {});
}

// Avec le code-splitting (React.lazy), chaque route non encore visitée charge
// son propre fichier JS avec un nom haché (ex: index-CJTlUJ4z.js). Si un nouveau
// déploiement écrase les anciens fichiers pendant qu'un onglet reste ouvert (ou
// après un retour arrière depuis une page externe comme MonCash), ce fichier
// n'existe plus — le serveur renvoie sa page HTML de secours à la place, et le
// navigateur refuse de l'exécuter comme script ("MIME type text/html"), page
// blanche garantie, qu'un simple refresh ne corrige pas car rien ne dit au
// navigateur d'aller chercher le NOUVEL index.html avec les bons noms de
// fichiers. Vite émet 'vite:preloadError' précisément dans ce cas — on force
// alors un rechargement complet (une seule fois, pour éviter une boucle si le
// problème persiste pour une autre raison).
window.addEventListener('vite:preloadError', () => {
  if (sessionStorage.getItem('reloaded-after-preload-error')) return;
  sessionStorage.setItem('reloaded-after-preload-error', '1');
  window.location.reload();
});

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // 30s — assez court pour que commandes/statuts/notifications restent à
      // jour, assez long pour ne pas re-fetcher à chaque micro-interaction.
      // (refetchOnMount/refetchOnWindowFocus par défaut de react-query = true,
      // donc changer de page ou revenir sur l'onglet rafraîchit les données
      // périmées — c'était désactivé avant, ce qui gelait tout jusqu'au reload.)
      staleTime: 30 * 1000,
      gcTime:    30 * 60 * 1000,  // 30 min — keep inactive data in memory
      retry: false,
    },
  },
});

// Le flag n'est utile que pour éviter une boucle immédiate après le reload
// forcé ci-dessus — une fois l'app relancée avec succès, on le retire pour
// qu'un futur (nouveau) déploiement puisse déclencher le même rechargement.
sessionStorage.removeItem('reloaded-after-preload-error');

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <AppSnackbarProvider>
            <App />
          </AppSnackbarProvider>
        </QueryClientProvider>
      </ErrorBoundary>
    </ThemeProvider>
  </React.StrictMode>
);
