import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // Google OAuth only allows registered origins, so never drift to 5174/5175
    strictPort: true,
    proxy: {
      '/api': 'http://localhost:5000',
    },
    // Pre-transform all pages at startup so the first click isn't slow in dev
    warmup: {
      clientFiles: ['./src/**/*.jsx', './src/**/*.js'],
    },
  },
});
