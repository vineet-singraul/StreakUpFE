import { useCallback, useEffect, useRef, useState } from 'react';
import api from './api';

// In-memory stale-while-revalidate cache: pages render saved data instantly,
// then refresh it from the server in the background.
const store = new Map();
const inflight = new Map();

const keyOf = (url, params) => {
  const qs = params ? new URLSearchParams(params).toString() : '';
  return qs ? `${url}?${qs}` : url;
};

function fetchKey(key, url, params) {
  if (!inflight.has(key)) {
    const p = api
      .get(url, { params })
      .then((res) => {
        store.set(key, res.data);
        return res.data;
      })
      .finally(() => inflight.delete(key));
    inflight.set(key, p);
  }
  return inflight.get(key);
}

export function prefetch(url, params) {
  return fetchKey(keyOf(url, params), url, params).catch(() => {});
}

export function clearCache() {
  store.clear();
}

/** const { data, error, setData, reload } = useApi('/tasks', { date }) */
export function useApi(url, params) {
  const key = url ? keyOf(url, params) : null;
  const [state, setState] = useState(() => ({ key, data: key ? store.get(key) : undefined, error: null }));
  const keyRef = useRef(key);
  const paramsRef = useRef(params);
  paramsRef.current = params;

  const current = state.key === key ? state : { key, data: key ? store.get(key) : undefined, error: null };

  const reload = useCallback(() => {
    if (!key) return Promise.resolve();
    return fetchKey(key, url, paramsRef.current)
      .then((data) => {
        if (keyRef.current === key) setState({ key, data, error: null });
        return data;
      })
      .catch((error) => {
        if (keyRef.current === key) setState((s) => ({ key, data: s.key === key ? s.data : undefined, error }));
      });
  }, [key, url]);

  useEffect(() => {
    keyRef.current = key;
    reload();
  }, [key, reload]);

  const setData = useCallback(
    (updater) => {
      setState((s) => {
        const prev = s.key === key ? s.data : store.get(key);
        const next = typeof updater === 'function' ? updater(prev) : updater;
        if (key) store.set(key, next);
        return { key, data: next, error: null };
      });
    },
    [key],
  );

  return { data: current.data, error: current.error, setData, reload };
}
