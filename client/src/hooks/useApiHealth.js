import { useCallback, useEffect, useState } from 'react';
import { fetchHealth } from '../api/health.js';

const INITIAL_STATE = { status: 'checking', health: null, error: null, checkedAt: null };

export function useApiHealth() {
  const [state, setState] = useState(INITIAL_STATE);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();

    fetchHealth({ signal: controller.signal })
      .then((health) => {
        setState({ status: 'online', health, error: null, checkedAt: new Date() });
      })
      .catch((error) => {
        // Aborts come from unmounting or a newer check replacing this one.
        if (controller.signal.aborted) return;
        setState({ status: 'offline', health: null, error: error.message, checkedAt: new Date() });
      });

    return () => controller.abort();
  }, [attempt]);

  const recheck = useCallback(() => {
    setState((previous) => ({ ...previous, status: 'checking' }));
    setAttempt((count) => count + 1);
  }, []);

  return { ...state, recheck };
}
