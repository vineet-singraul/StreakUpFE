import net from 'node:net';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

const LIVE_API = 'https://streakupbe.onrender.com';

/** true if something is listening at http://host:port (checked once when `npm run dev` starts) */
function isUp(target) {
  const { hostname, port } = new URL(target);
  return new Promise((resolve) => {
    const socket = net.connect({ host: hostname, port: Number(port) || 80 });
    const done = (ok) => { socket.destroy(); resolve(ok); };
    socket.setTimeout(800, () => done(false));
    socket.once('connect', () => done(true));
    socket.once('error', () => done(false));
  });
}

// A new id on every build; the app compares it with /version.json to auto-update itself
const APP_VERSION = new Date().toISOString();

const versionFile = () => ({
  name: 'emit-version-json',
  generateBundle() {
    this.emitFile({ type: 'asset', fileName: 'version.json', source: JSON.stringify({ version: APP_VERSION }) });
  },
});

export default defineConfig(async ({ command, mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  // Where `npm run dev` sends /api: DEV_API_TARGET (local backend by default).
  // If that local backend isn't running, fall back to the live Render backend instead of failing.
  let apiTarget = env.DEV_API_TARGET || 'http://localhost:5000';
  if (command === 'serve' && apiTarget.includes('localhost') && !(await isUp(apiTarget))) {
    console.log(`\n  ⚠  Local backend (${apiTarget}) band hai, isliye live backend use ho raha hai: ${LIVE_API}`);
    console.log('     Local backend use karna ho: Backend folder me `npm run dev` chalao, fir frontend restart karo.\n');
    apiTarget = LIVE_API;
  }

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
        '/api': {
          target: apiTarget,
          changeOrigin: true,
          secure: true,
          // One short line instead of a stack trace per request when the backend is down
          configure: (proxy) => {
            let last = 0;
            proxy.on('error', (err, req, res) => {
              if (Date.now() - last > 10000) {
                last = Date.now();
                console.log(`  ✖  Backend (${apiTarget}) se connect nahi ho paya: ${err.code || err.message}. Backend chal raha hai?`);
              }
              if (res && !res.headersSent && typeof res.writeHead === 'function') {
                res.writeHead(503, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ message: 'Backend band hai. Backend folder me `npm run dev` chalao.' }));
              }
            });
          },
        },
      },
      // Pre-transform all pages at startup so the first click isn't slow in dev
      warmup: {
        clientFiles: ['./src/**/*.jsx', './src/**/*.js'],
      },
    },
  };
});
