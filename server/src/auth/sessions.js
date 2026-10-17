import { createHash, randomBytes } from 'node:crypto';
import { Session } from '../models/Session.js';

export const SESSION_COOKIE = 'vb_session';

function hashToken(token) {
  return createHash('sha256').update(token).digest('hex');
}

export function sessionCookieOptions(config) {
  return {
    httpOnly: true,
    secure: config.isProduction,
    sameSite: 'strict',
    path: '/api',
    maxAge: config.sessionTtlMs,
  };
}

export async function createSession(userId, ttlMs) {
  const token = randomBytes(32).toString('base64url');
  const session = await Session.create({
    _id: hashToken(token),
    user: userId,
    csrfToken: randomBytes(32).toString('base64url'),
    expiresAt: new Date(Date.now() + ttlMs),
  });
  return { token, session };
}

export async function findActiveSession(token) {
  if (typeof token !== 'string' || token === '') {
    return null;
  }

  const session = await Session.findOne({ _id: hashToken(token), expiresAt: { $gt: new Date() } }).populate('user');
  return session?.user ? session : null;
}

export async function deleteSession(session) {
  await Session.deleteOne({ _id: session._id });
}
