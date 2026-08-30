import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SnackbarProvider } from 'notistack';
import { ThemeProvider, CssBaseline } from '@mui/material';
import App from './App';
import adminTheme from './theme';

const queryClient = new QueryClient({ defaultOptions: { queries: { staleTime: 30000, retry: 1 } } });

// Avec le code-splitting (React.lazy), chaque page non encore visitée charge son
// propre fichier JS avec un nom haché (ex: SellersPage-DEeslxDP.js). Si un nouveau
// déploiement écrase les anciens fichiers pendant qu'un onglet admin reste ouvert,
// ce fichier n'existe plus — 404, "Failed to fetch dynamically imported module",
// page blanche garantie, qu'un simple refresh ne corrige pas puisque rien ne dit
// au navigateur d'aller chercher le NOUVEL index.html avec les bons noms de
// fichiers. Vite émet 'vite:preloadError' précisément dans ce cas — on force
// alors un rechargement complet (une seule fois, pour éviter une boucle si le
// problème persiste pour une autre raison).
window.addEventListener('vite:preloadError', () => {
  if (sessionStorage.getItem('reloaded-after-preload-error')) return;
  sessionStorage.setItem('reloaded-after-preload-error', '1');
  window.location.reload();
});
sessionStorage.removeItem('reloaded-after-preload-error');

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider theme={adminTheme}>
      <CssBaseline />
      <QueryClientProvider client={queryClient}>
        <SnackbarProvider maxSnack={3} anchorOrigin={{ vertical: 'top', horizontal: 'right' }}>
          <App />
        </SnackbarProvider>
      </QueryClientProvider>
    </ThemeProvider>
  </React.StrictMode>
);
