import api from './api';

// IP-based approximate location only: no GPS, no browser prompt.
// Kept up to date automatically while the app is open:
//  - right away when tracking starts (login / app open)
//  - every 1 minute while the app is open (browsers may pause this when the app is in the background)
//  - when the user comes back to the app (tab / PWA brought to the front)
//  - when the network changes (Wi-Fi <-> mobile data gives a new IP, often a new city)
// The backend caches each IP's lookup for 6h, so this doesn't hit the IP providers' limits.
const INTERVAL = 60 * 1000;
const MIN_GAP = 50 * 1000; // never more than ~one report a minute (slack for timer jitter)
const RETURN_GAP = 2 * 60 * 1000; // coming back to the app re-reports if the last one is older than this

let running = false;
let lastSent = 0;
let sending = false;
let timer = null;
const listeners = [];

// The device's IPv6 (if it has one). Mobile carriers share IPv4 across cities, while the IPv6
// prefix is usually tied to the local network, so it helps the backend pick the right city.
async function getIpv6() {
  try {
    const res = await fetch('https://api6.ipify.org?format=json', { signal: AbortSignal.timeout(3000) });
    return (await res.json()).ip || null;
  } catch {
    return null; // no IPv6 / blocked: the backend still uses the request IP
  }
}

async function send(minGap = MIN_GAP) {
  if (!running || sending || Date.now() - lastSent < minGap) return;
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return;
  sending = true;
  try {
    const ipv6 = await getIpv6();
    await api.post('/location/ip', ipv6 ? { ipv6 } : {});
    lastSent = Date.now();
  } catch {
    /* retried on the next tick / visibility / network change */
  } finally {
    sending = false;
  }
}

function on(target, event, fn) {
  target.addEventListener(event, fn);
  listeners.push(() => target.removeEventListener(event, fn));
}

export function reportIp() {
  if (running) return;
  running = true;
  send(0);

  timer = setInterval(() => send(), INTERVAL);

  on(document, 'visibilitychange', () => {
    if (document.visibilityState === 'visible') send(RETURN_GAP);
  });
  // Give the new connection a moment to settle before looking up its IP
  on(window, 'online', () => setTimeout(() => send(), 3000));
  const conn = navigator.connection;
  if (conn?.addEventListener) on(conn, 'change', () => setTimeout(() => send(), 3000));
}

/** Stops all automatic updates (called on logout). */
export function resetTracking() {
  running = false;
  lastSent = 0;
  clearInterval(timer);
  timer = null;
  listeners.splice(0).forEach((off) => off());
}
