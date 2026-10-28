import api from './api';

function urlBase64ToUint8Array(base64) {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

export const pushSupported = () =>
  'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;

/** Asks permission, subscribes this browser and saves it on the server */
export async function enablePush() {
  if (!pushSupported()) throw new Error('Ye browser notifications support nahi karta');

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') throw new Error('Notification permission deny ho gayi. Browser settings se allow karo.');

  const reg = await navigator.serviceWorker.register('/sw.js');
  await navigator.serviceWorker.ready;

  const { data } = await api.get('/notifications/public-key');
  if (!data.publicKey) throw new Error('Server par VAPID key set nahi hai');

  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(data.publicKey),
    });
  }
  const res = await api.post('/notifications/subscribe', sub.toJSON());
  return res.data.user;
}

/** Re-registers the worker on load so pushes keep working */
export async function registerServiceWorker() {
  if (!pushSupported()) return;
  try {
    await navigator.serviceWorker.register('/sw.js');
  } catch {
    /* ignore */
  }
}
