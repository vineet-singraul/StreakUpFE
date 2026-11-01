import { useEffect, useState } from 'react';

// Reverse geocoding (lat/lng -> address) with OpenStreetMap Nominatim: free, no API key.
// Its usage policy allows ~1 request/second, so requests go through a queue and results are
// cached in localStorage (a location only ever needs to be looked up once).
const CACHE_KEY = 'ht_geo_cache';
const memory = (() => {
  try {
    return JSON.parse(localStorage.getItem(CACHE_KEY)) || {};
  } catch {
    return {};
  }
})();
const inflight = {};
let queue = Promise.resolve();

const keyOf = (lat, lng) => `${lat.toFixed(4)},${lng.toFixed(4)}`;

function persist() {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(memory));
  } catch {
    /* ignore */
  }
}

export function reverseGeocode(lat, lng) {
  const key = keyOf(lat, lng);
  if (memory[key]) return Promise.resolve(memory[key]);
  if (inflight[key]) return inflight[key];

  inflight[key] = queue = queue
    .then(() => new Promise((r) => setTimeout(r, 1100)))
    .then(() =>
      fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&addressdetails=1&lat=${lat}&lon=${lng}`, {
        headers: { 'Accept-Language': 'en' },
      }),
    )
    .then((res) => (res.ok ? res.json() : Promise.reject(new Error(`HTTP ${res.status}`))))
    .then((data) => {
      const a = data.address || {};
      const result = {
        full: data.display_name || '',
        area: a.suburb || a.neighbourhood || a.village || a.hamlet || a.road || '',
        city: a.city || a.town || a.county || a.state_district || '',
        state: a.state || '',
        postcode: a.postcode || '',
        country: a.country || '',
      };
      memory[key] = result;
      persist();
      return result;
    })
    .finally(() => delete inflight[key]);

  // Keep the queue going even if one lookup fails
  queue = queue.catch(() => {});
  return inflight[key];
}

/** { address, loading, error } for a stored location (or null). */
export function useAddress(location) {
  const lat = location?.latitude;
  const lng = location?.longitude;
  const cached = lat != null ? memory[keyOf(lat, lng)] : null;
  const [state, setState] = useState({ address: cached, error: false });

  useEffect(() => {
    if (lat == null) return undefined;
    let alive = true;
    reverseGeocode(lat, lng)
      .then((address) => alive && setState({ address, error: false }))
      .catch(() => alive && setState({ address: null, error: true }));
    return () => {
      alive = false;
    };
  }, [lat, lng]);

  const address = state.address || cached;
  return { address, loading: lat != null && !address && !state.error, error: state.error };
}
