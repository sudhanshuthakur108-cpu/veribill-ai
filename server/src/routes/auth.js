import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import { hashPassword, verifyAgainstUnusedHash, verifyPassword } from '../auth/passwords.js';
import { SESSION_COOKIE, createSession, deleteSession, sessionCookieOptions } from '../auth/sessions.js';
import { validateLogin, validateRegistration } from '../auth/validation.js';
import { HttpError } from '../httpError.js';
import { requireAuth, requireCsrfToken } from '../middleware/auth.js';
import { User, toPublicUser } from '../models/User.js';

const MINUTE = 60 * 1000;
const DUPLICATE_KEY_ERROR = 11000;

function createLimiter({ message, ...options }) {
  return rateLimit({
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    handler: (req, res, next) => next(new HttpError(429, message)),
    ...options,
  });
}

export function createAuthRouter(config) {
  const router = Router();
  const cookieOptions = sessionCookieOptions(config);

  // Rate limits are kept in process memory, so they reset on restart and apply per instance.
  const registerLimiter = createLimiter({
    windowMs: 60 * MINUTE,
    limit: 10,
    message: 'Too many sign-up attempts. Try again later.',
  });
  // Only wrong credentials (401) count. Validation and server errors, such as a
  // database outage, say nothing about a guessed password and must not lock people out.
  const loginLimiter = createLimiter({
    windowMs: 15 * MINUTE,
    limit: 10,
    skipSuccessfulRequests: true,
    requestWasSuccessful: (req, res) => res.statusCode !== 401,
    message: 'Too many failed sign-in attempts. Try again in 15 minutes.',
  });

  // Signing in replaces any existing session, so a session id can never be carried
  // across an authentication change.
  async function startSession(req, res, user) {
    if (req.authSession) {
      await deleteSession(req.authSession);
    }
    const { token, session } = await createSession(user._id, config.sessionTtlMs);
    res.cookie(SESSION_COOKIE, token, cookieOptions);
    return { user: toPublicUser(user), csrfToken: session.csrfToken };
  }

  router.use((req, res, next) => {
    res.set('Cache-Control', 'no-store');
    next();
  });

  router.post('/register', registerLimiter, async (req, res) => {
    const { name, email, password } = validateRegistration(req.body);
    const passwordHash = await hashPassword(password);

    let user;
    try {
      user = await User.create({ name, email, passwordHash });
    } catch (error) {
      if (error.code === DUPLICATE_KEY_ERROR) {
        throw new HttpError(409, 'An account with this email already exists.', {
          email: 'An account with this email already exists.',
        });
      }
      throw error;
    }

    res.status(201).json(await startSession(req, res, user));
  });

  router.post('/login', loginLimiter, async (req, res) => {
    const { email, password } = validateLogin(req.body);
    const user = await User.findOne({ email }).select('+passwordHash');

    const passwordMatches = user
      ? await verifyPassword(user.passwordHash, password)
      : await verifyAgainstUnusedHash(password);

    if (!passwordMatches) {
      throw new HttpError(401, 'Incorrect email or password.');
    }

    res.json(await startSession(req, res, user));
  });

  router.post('/logout', requireAuth, requireCsrfToken, async (req, res) => {
    await deleteSession(req.authSession);
    res.clearCookie(SESSION_COOKIE, cookieOptions);
    res.status(204).end();
  });

  router.get('/me', requireAuth, (req, res) => {
    res.json({ user: toPublicUser(req.user), csrfToken: req.authSession.csrfToken });
  });

  return router;
}
