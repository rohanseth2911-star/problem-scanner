import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  root: 'client',
  plugins: [react()],
  build: { outDir: '../dist/client', emptyOutDir: true },
  server: {
    port: 5173,
    // Bind all interfaces so container hosts (Replit, Codespaces, Docker) can
    // reach the dev server from outside.
    host: true,
    allowedHosts: true,
    proxy: {
      '/api': { target: 'http://127.0.0.1:3001', changeOrigin: true },
    },
  },
});
