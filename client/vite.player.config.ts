import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const packageJson = JSON.parse(readFileSync(resolve(__dirname, 'package.json'), 'utf-8'));

// Player app — built as its own bundle, served on the player subdomain.
export default defineConfig({
  plugins: [react()],
  root: resolve(__dirname, 'apps/player'),
  publicDir: resolve(__dirname, 'public'),
  define: {
    __APP_VERSION__: JSON.stringify(packageJson.version),
  },
  envPrefix: 'VITE_',
  build: {
    outDir: resolve(__dirname, '../api/public/play'),
    emptyOutDir: true,
    chunkSizeWarningLimit: 3000,
  },
  server: {
    port: 5173,
    allowedHosts: ['localhost', '127.0.0.1'],
    // Allow serving shared source that lives outside this app's root.
    fs: { allow: [resolve(__dirname)] },
    proxy: {
      '/api': { target: 'http://localhost:3000', changeOrigin: true },
      '/socket.io': { target: 'http://localhost:3000', changeOrigin: true, ws: true },
      '/map-images': { target: 'http://localhost:3000', changeOrigin: true },
    },
  },
});
