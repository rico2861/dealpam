import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
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
        runtimeCaching: [
          {
            // API products — network first, fallback to cache 5 min
            urlPattern: /^https?:\/\/.*\/v1\/products/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-products',
              expiration: { maxEntries: 100, maxAgeSeconds: 300 },
              networkTimeoutSeconds: 5,
            },
          },
          {
            // Plans d'abonnement / abonnement du vendeur — toujours vérifier le
            // serveur en premier (tarifs, quotas, statut d'annulation ne doivent
            // jamais rester figés sur une vieille valeur mise en cache).
            urlPattern: /^https?:\/\/.*\/v1\/subscriptions/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-subscriptions',
              expiration: { maxEntries: 20, maxAgeSeconds: 60 },
              networkTimeoutSeconds: 5,
            },
          },
          {
            // Product images — cache first, 7 days
            urlPattern: /^https?:\/\/.*\.(png|jpg|jpeg|webp|gif|svg)$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'images',
              expiration: { maxEntries: 300, maxAgeSeconds: 604800 },
            },
          },
          {
            // All other API calls — stale while revalidate
            urlPattern: /^https?:\/\/.*\/v1\//,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'api-other',
              expiration: { maxEntries: 60, maxAgeSeconds: 86400 },
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
});
