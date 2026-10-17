import { useCallback, useEffect, useMemo, useState } from 'react';
import * as authApi from '../api/auth.js';
import { AuthContext } from './AuthContext.js';

const SIGNED_OUT = { status: 'anonymous', user: null, csrfToken: null, error: null };

function signedIn({ user, csrfToken }) {
  return { status: 'authenticated', user, csrfToken, error: null };
}

// The session itself lives in an HttpOnly cookie. This state only mirrors what the
// server reports, and the CSRF token is kept in memory, never in browser storage.
export default function AuthProvider({ children }) {
  const [state, setState] = useState({ ...SIGNED_OUT, status: 'loading' });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();

    authApi
      .getSession({ signal: controller.signal })
      .then((session) => setState(signedIn(session)))
      .catch((error) => {
        if (controller.signal.aborted) return;
        setState(error.status === 401 ? SIGNED_OUT : { ...SIGNED_OUT, status: 'error', error: error.message });
      });

    return () => controller.abort();
  }, [attempt]);

  const retry = useCallback(() => {
    setState((previous) => ({ ...previous, status: 'loading' }));
    setAttempt((count) => count + 1);
  }, []);

  const signIn = useCallback(async (credentials) => {
    setState(signedIn(await authApi.login(credentials)));
  }, []);

  const signUp = useCallback(async (details) => {
    setState(signedIn(await authApi.register(details)));
  }, []);

  const { csrfToken } = state;
  const signOut = useCallback(async () => {
    try {
      await authApi.logout(csrfToken);
    } catch (error) {
      // A 401 means the server session is already gone, which is the goal anyway.
      if (error.status !== 401) throw error;
    }
    setState(SIGNED_OUT);
  }, [csrfToken]);

  const value = useMemo(
    () => ({ ...state, retry, signIn, signUp, signOut }),
    [state, retry, signIn, signUp, signOut],
  );

  return <AuthContext value={value}>{children}</AuthContext>;
}
