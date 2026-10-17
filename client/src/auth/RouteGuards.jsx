import { Navigate, Outlet, useLocation } from 'react-router';
import { useAuth } from './AuthContext.js';

function SessionStatus({ children }) {
  return (
    <div className="session-status" role="status">
      {children}
    </div>
  );
}

export function RequireAuth() {
  const { status, error, retry } = useAuth();
  const location = useLocation();

  if (status === 'loading') {
    return <SessionStatus>Checking your session…</SessionStatus>;
  }

  if (status === 'error') {
    return (
      <SessionStatus>
        <p>We couldn’t check whether you’re signed in.</p>
        <p className="session-status-detail">{error}</p>
        <button type="button" className="button" onClick={retry}>
          Try again
        </button>
      </SessionStatus>
    );
  }

  if (status === 'anonymous') {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return <Outlet />;
}

// Only follow redirect targets that are paths inside this app.
function redirectTarget(from) {
  return typeof from === 'string' && from.startsWith('/') && !from.startsWith('//') ? from : '/';
}

export function RequireGuest() {
  const { status } = useAuth();
  const location = useLocation();

  if (status === 'loading') {
    return <SessionStatus>Checking your session…</SessionStatus>;
  }

  if (status === 'authenticated') {
    return <Navigate to={redirectTarget(location.state?.from)} replace />;
  }

  return <Outlet />;
}
