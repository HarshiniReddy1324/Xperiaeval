import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const PRODUCTION_API_BASE =
  process.env.VITE_API_BASE || 'https://succeed-renewal-eur-fair.trycloudflare.com';

export default defineConfig(({ mode }) => ({
  plugins: [react()],
  define:
    mode === 'production'
      ? { 'import.meta.env.VITE_API_BASE': JSON.stringify(PRODUCTION_API_BASE) }
      : undefined,
  server: {
    port: 5173,
    proxy: {
      '/api': { target: 'http://127.0.0.1:3001', changeOrigin: true },
      '/uploads': { target: 'http://127.0.0.1:3001', changeOrigin: true },
    },
  },
}));
