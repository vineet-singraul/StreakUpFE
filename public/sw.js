// Service worker: installable PWA + push notifications.
// It never caches app code, so every launch loads the latest deploy from Vercel.

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

const OFFLINE_HTML = `<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1">
<title>StreakUp</title><body style="font-family:sans-serif;display:grid;place-items:center;height:100vh;margin:0;background:#4f46e5;color:#fff;text-align:center">
<div><h2>Internet nahi hai 📶</h2><p>Connection aate hi app khul jayegi.</p><button onclick="location.reload()" style="padding:10px 18px;border:0;border-radius:8px;font-weight:600">Retry</button></div>`;

self.addEventListener('fetch', (event) => {
  if (event.request.mode !== 'navigate') return;
  event.respondWith(
    fetch(event.request).catch(() => new Response(OFFLINE_HTML, { headers: { 'Content-Type': 'text/html; charset=utf-8' } })),
  );
});

self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { body: event.data && event.data.text() };
  }
  event.waitUntil(
    self.registration.showNotification(data.title || 'StreakUp', {
      body: data.body || '',
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      data: { url: data.url || '/' },
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = new URL(event.notification.data?.url || '/', self.location.origin).href;
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const c of clients) {
        if ('focus' in c) {
          c.navigate(url);
          return c.focus();
        }
      }
      return self.clients.openWindow(url);
    }),
  );
});
