import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../auth/AuthContext.js';

// Runs `load(signal)` whenever `load` changes, so callers memoize it with
// useCallback over the values it depends on. A result only counts for the request
// that produced it, which keeps a slow earlier response from replacing a newer one.
export function useApiResource(load) {
  const { sessionExpired } = useAuth();
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState(null);

  useEffect(() => {
    const controller = new AbortController();

    load(controller.signal).then(
      (data) => setResult({ load, attempt, data, error: null }),
      (error) => {
        if (controller.signal.aborted) return;
        if (error.status === 401) sessionExpired();
        setResult({ load, attempt, data: null, error });
      },
    );

    return () => controller.abort();
  }, [load, attempt, sessionExpired]);

  const retry = useCallback(() => setAttempt((count) => count + 1), []);
  const current = result?.load === load && result.attempt === attempt ? result : null;

  let status = 'loading';
  if (current) {
    status = current.error ? 'error' : 'ready';
  }
  return { status, data: current?.data ?? null, error: current?.error ?? null, retry };
}
