import api from './api';

// IP-based approximate location only. Reported once per page load; no GPS, no browser prompt.
let ipSent = false;

export function reportIp() {
  if (ipSent) return;
  ipSent = true;
  api.post('/location/ip').catch(() => { ipSent = false; });
}

export function resetTracking() {
  ipSent = false;
}
