import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// A new id on every build; the app compares it with /version.json to auto-update itself
const APP_VERSION = new Date().toISOString();

const versionFile = () => ({
  name: 'emit-version-json',
  generateBundle() {
    this.emitFile({ type: 'asset', fileName: 'version.json', source: JSON.stringify({ version: APP_VERSION }) });
  },
});

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  // Where `npm run dev` sends /api: the local backend by default,
  // or the live Render backend if DEV_API_TARGET is set in Frontend/.env
  const apiTarget = env.DEV_API_TARGET || 'http://localhost:5000';

  return {
    plugins: [react(), versionFile()],
    define: {
      __APP_VERSION__: JSON.stringify(APP_VERSION),
    },
    server: {
      port: 5173,
      // Google OAuth only allows registered origins, so never drift to 5174/5175
      strictPort: true,
      proxy: {
        '/api': { target: apiTarget, changeOrigin: true, secure: true },
      },
      // Pre-transform all pages at startup so the first click isn't slow in dev
      warmup: {
        clientFiles: ['./src/**/*.jsx', './src/**/*.js'],
      },
    },
  };
});
