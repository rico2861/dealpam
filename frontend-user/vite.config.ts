import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => ({
  // En production, retire tous les console.log/warn/error/debugger du bundle —
  // aucune trace de debug interne (noms de variables, structure du code) ne
  // doit fuiter dans la console d'un visiteur, dev ou non.
  esbuild: mode === 'production' ? { drop: ['console', 'debugger'] } : {},
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'icons/*.png'],
      manifest: {
        name: 'Dealpam',
        short_name: 'Dealpam',
        description: 'La marketplace haitienne — achetez et vendez partout en Haiti',
        start_url: '/home',
        display: 'standalone',
        background_color: '#0F172A',
        theme_color: '#FF6B00',
        orientation: 'portrait-primary',
        lang: 'fr',
        icons: [
          { src: '/icons/icon-72.png',  sizes: '72x72',  type: 'image/png', purpose: 'any' },
          { src: '/icons/icon-96.png',  sizes: '96x96',  type: 'image/png', purpose: 'any' },
          { src: '/icons/icon-128.png', sizes: '128x128', type: 'image/png', purpose: 'any' },
          { src: '/icons/icon-144.png', sizes: '144x144', type: 'image/png', purpose: 'any' },
          { src: '/icons/icon-152.png', sizes: '152x152', type: 'image/png', purpose: 'any' },
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any maskable' },
          { src: '/icons/icon-384.png', sizes: '384x384', type: 'image/png', purpose: 'any' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
        ],
        categories: ['shopping', 'lifestyle'],
      },
      workbox: {
        // Cache app shell (JS/CSS/HTML)
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        // Runtime caching for API calls
        //
        // IMPORTANT — ne JAMAIS mettre en cache une réponse de /v1/* ici.
        // Workbox met en cache une réponse par URL seule, sans tenir compte
        // du header Authorization. Si un client se déconnecte et qu'un autre
        // compte se connecte sur le même appareil, ou si le réseau est lent,
        // NetworkFirst peut renvoyer la réponse mise en cache du PREMIER
        // compte au SECOND compte — un vrai bug de fuite de données entre
        // comptes (déjà arrivé : /users/me, /orders, /subscriptions...).
        // Un simple F5 ne vide pas ce cache (Cache Storage != cache HTTP).
        // Seules les images (publiques, non liées à un compte) restent en cache.
        runtimeCaching: [
          {
            // Product images — cache first, 7 days
            urlPattern: /^https?:\/\/.*\.(png|jpg|jpeg|webp|gif|svg)$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'images',
              expiration: { maxEntries: 300, maxAgeSeconds: 604800 },
            },
          },
        ],
        // Skip waiting so updates apply immediately
        skipWaiting: true,
        clientsClaim: true,
      },
      devOptions: {
        enabled: false, // keep dev server fast
      },
    }),
  ],
  server: {
    port: 5173,
    host: '0.0.0.0',   // accessible sur tout le réseau local (mobile via IP WiFi)
    proxy: {
      '/v1': {
        target: 'http://127.0.0.1:3000',
        changeOrigin: true,
        secure: false,
      },
      '/socket.io': {
        target: 'http://127.0.0.1:3000',
        changeOrigin: true,
        secure: false,
        ws: true,   // proxy WebSocket connections (Socket.IO)
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    chunkSizeWarningLimit: 2000,
    rollupOptions: {
      output: {
        // Split large vendor chunks for better caching
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-mui': ['@mui/material', '@mui/icons-material'],
          'vendor-query': ['@tanstack/react-query'],
        },
      },
    },
  },
}));
