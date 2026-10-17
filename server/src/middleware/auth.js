import { timingSafeEqual } from 'node:crypto';
import { SESSION_COOKIE, findActiveSession } from '../auth/sessions.js';
import { HttpError } from '../httpError.js';

export async function loadSession(req, res, next) {
  const session = await findActiveSession(req.cookies[SESSION_COOKIE]);
  if (session) {
    req.authSession = session;
    req.user = session.user;
  }
  next();
}

export function requireAuth(req, res, next) {
  if (!req.user) {
    throw new HttpError(401, 'Sign in to continue.');
  }
  next();
}

// Synchronizer token check for state-changing requests made with the session cookie.
export function requireCsrfToken(req, res, next) {
  const provided = Buffer.from(req.get('X-CSRF-Token') ?? '');
  const expected = Buffer.from(req.authSession.csrfToken);

  if (provided.length !== expected.length || !timingSafeEqual(provided, expected)) {
    throw new HttpError(403, 'Invalid or missing CSRF token.');
  }
  next();
}
