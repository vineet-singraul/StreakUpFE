import { useEffect, useState } from 'react';

// Chrome/Edge/Android fire `beforeinstallprompt` once, early, so we catch it at startup
// (imported from main.jsx) and keep it until the user taps "Install" in Settings.
let deferred = null;
const listeners = new Set();
const notify = () => listeners.forEach((fn) => fn());

export const isStandalone = () =>
  window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true;

export const isIOS = () =>
  /iphone|ipad|ipod/i.test(navigator.userAgent) ||
  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1); // iPadOS reports as Mac

let installed = isStandalone();

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault(); // we show our own button instead of the mini-infobar
    deferred = e;
    notify();
  });
  window.addEventListener('appinstalled', () => {
    deferred = null;
    installed = true;
    notify();
  });
}

/** Shows the browser's install dialog. Resolves to 'accepted' | 'dismissed' | 'unavailable'. */
export async function promptInstall() {
  if (!deferred) return 'unavailable';
  const e = deferred;
  deferred = null;
  e.prompt();
  const { outcome } = await e.userChoice;
  if (outcome === 'accepted') installed = true;
  notify();
  return outcome;
}

/** 'installed' | 'ready' (one-tap install) | 'ios' (manual Share steps) | 'manual' (browser menu) */
export function useInstallState() {
  const get = () => (installed || isStandalone() ? 'installed' : deferred ? 'ready' : isIOS() ? 'ios' : 'manual');
  const [state, setState] = useState(get);
  useEffect(() => {
    const fn = () => setState(get());
    listeners.add(fn);
    fn();
    return () => listeners.delete(fn);
  }, []);
  return state;
}
