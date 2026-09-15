import { useCallback, useEffect, useState } from 'react';
import client from '../api/client.js';

/**
 * Fetches `endpoint` on mount and whenever `deps` change, and exposes a
 * `refresh()` you can call from a socket event handler so the dashboard
 * updates in place when a live event arrives — no manual polling needed.
 */
export function useApiData(endpoint, deps = []) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError(null);
    try {
      const res = await client.get(endpoint);
      setData(res.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Something went wrong loading this data.');
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [endpoint]);

  useEffect(() => { load(); }, [...deps, load]);

  return { data, loading, error, refresh: () => load(true), reload: () => load(false) };
}
