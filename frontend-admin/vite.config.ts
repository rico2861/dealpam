import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig(({ mode }) => ({
  // En production, retire tous les console.log/warn/error/debugger du bundle.
  esbuild: mode === 'production' ? { drop: ['console', 'debugger'] } : {},
  plugins: [react()],
  server: { port: 5174, proxy: { '/v1': { target: 'http://localhost:3000', changeOrigin: true } } },
  build: { outDir: 'dist', sourcemap: false }
}));
