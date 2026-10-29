import axios from 'axios';

export const TOKEN_KEY = 'ht_token';

const api = axios.create({ baseURL: import.meta.env.VITE_API_URL || '/api' });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// The free Render server sleeps when idle and needs ~30-50s to wake up.
// Meanwhile the proxy answers 502/503/504 or the connection fails: wait and retry.
const RETRY_DELAYS_MS = [3000, 6000, 10000, 15000, 20000];
const isWakingUp = (err) => !err.response || [502, 503, 504].includes(err.response.status);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const cfg = err.config;
    if (cfg && isWakingUp(err) && (cfg.__retry || 0) < RETRY_DELAYS_MS.length) {
      await sleep(RETRY_DELAYS_MS[cfg.__retry || 0]);
      cfg.__retry = (cfg.__retry || 0) + 1;
      return api(cfg);
    }
    if (isWakingUp(err)) {
      err.message = 'Server abhi start ho raha hai, 1 minute baad dobara try karo';
    }
    if (err.response?.status === 401 && !cfg?.url?.includes('/auth/google')) {
      localStorage.removeItem(TOKEN_KEY);
      if (window.location.pathname !== '/login') window.location.href = '/login';
    }
    return Promise.reject(err);
  },
);

export const errMsg = (err) => err?.response?.data?.message || err?.message || 'Something went wrong';

export default api;
