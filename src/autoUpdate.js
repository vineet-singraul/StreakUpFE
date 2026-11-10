/* global __APP_VERSION__ */

// When a new version is deployed, the installed app reloads itself:
// checked on launch, whenever the app comes back to the foreground, and every 10 minutes.
const CHECK_EVERY_MS = 10 * 60 * 1000;
let pendingReload = false;

const isTyping = () => {
  const el = document.activeElement;
  return el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable);
};

async function check() {
  try {
    const res = await fetch(`/version.json?t=${Date.now()}`, { cache: 'no-store' });
    if (!res.ok) return;
    const { version } = await res.json();
    if (version && version !== __APP_VERSION__) {
      if (document.visibilityState === 'visible' && !isTyping()) window.location.reload();
      else pendingReload = true;
    }
  } catch {
    /* offline: try again later */
  }
}

export function startAutoUpdate() {
  if (import.meta.env.DEV) return;

  check();
  setInterval(check, CHECK_EVERY_MS);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'visible') return;
    if (pendingReload) window.location.reload();
    else check();
  });
  document.addEventListener('focusout', () => {
    if (pendingReload && !isTyping()) window.location.reload();
  });

  // Keep the service worker itself fresh too
  navigator.serviceWorker?.getRegistration().then((reg) => reg?.update()).catch(() => {});
}
