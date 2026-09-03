import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './queryClient';
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

// Enregistrement manuel du service worker (VitePWA injectRegister:false, voir
// vite.config.ts) : le registerSW.js auto-injecté par défaut ne fait qu'un
// .register() brut, sans jamais reverifier une mise à jour tant que l'onglet
// reste ouvert — un visiteur pouvait rester bloqué sur une version vieille de
// plusieurs déploiements. Ici, on vérifie activement (au chargement, sur
// chaque retour au premier plan, et toutes les 5 min) et on recharge dès
// qu'une nouvelle version est détectée et activée.
import { registerSW } from 'virtual:pwa-register';

if ('serviceWorker' in navigator) {
  const updateSW = registerSW({
    immediate: true,
    onRegisteredSW(_url, registration) {
      if (!registration) return;
      const checkForUpdate = () => registration.update().catch(() => {});
      setInterval(checkForUpdate, 5 * 60_000);
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') checkForUpdate();
      });
    },
    onNeedRefresh() {
      // Silencieux plutôt qu'un bandeau "nouvelle version disponible" à
      // confirmer : sur une page de retour de paiement en particulier, un
      // visiteur qui doit cliquer quelque chose avant que ça se répare tout
      // seul revit exactement le bug qu'on corrige.
      updateSW(true);
    },
  });
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

// Le flag n'est utile que pour éviter une boucle immédiate après le reload
// forcé ci-dessus — une fois l'app relancée avec succès, on le retire pour
// qu'un futur (nouveau) déploiement puisse déclencher le même rechargement.
sessionStorage.removeItem('reloaded-after-preload-error');
// Même principe pour le filet de sécurité "script d'entrée cassé" tout en
// haut de index.html (couvre le cas où c'est le script principal lui-même
// qui échoue à charger, avant que ce fichier n'ait la moindre chance de
// s'exécuter — vite:preloadError ci-dessus ne couvre que les chunks lazy
// une fois l'app déjà démarrée).
sessionStorage.removeItem('dp_entry_reload_attempted');

// Filet de sécurité global contre les images produit cassées (fichier supprimé/
// jamais uploadé côté stockage R2 alors que la base garde encore l'URL) : sans
// ça, chaque <img> concernée affiche l'icône "image cassée" du navigateur sur
// TOUTE la plateforme (grilles produits, panier, checkout, chat...), quel que
// soit le composant qui l'affiche. Écoute en phase de capture (le seul moyen
// d'intercepter un événement 'error' d'<img>, qui ne remonte pas/bulle pas) et
// remplace la source par un SVG placeholder neutre, une seule fois par image
// (data-img-fallback évite une boucle si le placeholder lui-même échouait).
const IMG_FALLBACK_SRC = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"%3E%3Crect width="100" height="100" fill="%23F1F5F9"/%3E%3Cpath d="M30 65 L45 45 L55 55 L70 35 L75 65 Z" fill="%23CBD5E1"/%3E%3Ccircle cx="38" cy="38" r="6" fill="%23CBD5E1"/%3E%3C/svg%3E';
document.addEventListener('error', (e) => {
  const el = e.target as HTMLElement;
  if (el?.tagName === 'IMG' && !el.dataset.imgFallback) {
    el.dataset.imgFallback = '1';
    (el as HTMLImageElement).src = IMG_FALLBACK_SRC;
  }
}, true);

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
