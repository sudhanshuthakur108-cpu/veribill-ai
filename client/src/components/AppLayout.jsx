import { useState } from 'react';
import { Outlet } from 'react-router';
import { useAuth } from '../auth/AuthContext.js';
import { useApiHealth } from '../hooks/useApiHealth.js';
import ApiStatusBadge from './ApiStatusBadge.jsx';
import Brand from './Brand.jsx';

export default function AppLayout() {
  const apiHealth = useApiHealth();
  const { user, signOut } = useAuth();
  const [signingOut, setSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState('');

  async function handleSignOut() {
    setSigningOut(true);
    setSignOutError('');
    try {
      await signOut();
    } catch (error) {
      setSignOutError(error.message);
      setSigningOut(false);
    }
  }

  return (
    <div className="app">
      <header className="app-header">
        <Brand />
        <div className="header-actions">
          <ApiStatusBadge status={apiHealth.status} />
          <span className="user-name" title={user.email}>
            {user.name}
          </span>
          <button type="button" className="button button-quiet" onClick={handleSignOut} disabled={signingOut}>
            {signingOut ? 'Signing out…' : 'Sign out'}
          </button>
        </div>
      </header>

      {signOutError && (
        <p className="banner-error" role="alert">
          Could not sign out: {signOutError}
        </p>
      )}

      <main className="app-main">
        <Outlet context={apiHealth} />
      </main>

      <footer className="app-footer">VeriBill AI · foundation build</footer>
    </div>
  );
}
