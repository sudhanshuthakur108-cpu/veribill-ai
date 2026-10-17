import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { after, afterEach, before, beforeEach, describe, it } from 'node:test';
import { Session } from '../src/models/Session.js';
import { User } from '../src/models/User.js';
import { clearDatabase, startTestDatabase, startTestServer } from './support/testServer.js';

const account = { name: 'Asha Verma', email: 'asha@example.com', password: 'correct horse battery' };

let stopDatabase;
let server;

before(async () => {
  stopDatabase = await startTestDatabase();
});

after(async () => {
  await stopDatabase();
});

beforeEach(async () => {
  await clearDatabase();
  server = await startTestServer();
});

afterEach(async () => {
  await server.close();
});

function request(path, { method = 'GET', body, cookie, csrfToken, headers = {} } = {}) {
  return fetch(`${server.baseUrl}${path}`, {
    method,
    headers: {
      ...(body !== undefined && { 'Content-Type': 'application/json' }),
      ...(cookie && { Cookie: cookie }),
      ...(csrfToken && { 'X-CSRF-Token': csrfToken }),
      ...headers,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

function sessionSetCookie(response) {
  return response.headers.getSetCookie().find((header) => header.startsWith('vb_session='));
}

// Returns the "vb_session=<token>" pair a browser would send back.
function sessionCookie(response) {
  return sessionSetCookie(response)?.split(';')[0];
}

async function register(details = account) {
  const response = await request('/api/auth/register', { method: 'POST', body: details });
  return { response, body: await response.json(), cookie: sessionCookie(response) };
}

describe('POST /api/auth/register', () => {
  it('creates the account and starts a session', async () => {
    const { response, body, cookie } = await register({ ...account, email: '  Asha@Example.COM ' });

    assert.equal(response.status, 201);
    assert.deepEqual(Object.keys(body.user).sort(), ['email', 'id', 'name']);
    assert.equal(body.user.email, 'asha@example.com');
    assert.equal(body.user.name, 'Asha Verma');
    assert.equal(typeof body.csrfToken, 'string');
    assert.ok(cookie);
    assert.equal(response.headers.get('cache-control'), 'no-store');
  });

  it('sets a hardened session cookie', async () => {
    const { response } = await register();
    const attributes = sessionSetCookie(response).split('; ').map((part) => part.toLowerCase());

    assert.ok(attributes.includes('httponly'));
    assert.ok(attributes.includes('samesite=strict'));
    assert.ok(attributes.includes('path=/api'));
    assert.ok(attributes.includes(`max-age=${8 * 60 * 60}`));
    assert.ok(!attributes.includes('secure'), 'Secure is only set in production');
  });

  it('stores an argon2id hash instead of the password', async () => {
    const { body } = await register();
    const stored = await User.findById(body.user.id).select('+passwordHash').lean();

    assert.match(stored.passwordHash, /^\$argon2id\$/);
    assert.ok(!stored.passwordHash.includes(account.password));
    assert.ok(!JSON.stringify(body).includes(account.password));
  });

  it('stores only a hash of the session token', async () => {
    const { cookie } = await register();
    const token = cookie.split('=')[1];
    const sessions = await Session.find().lean();

    assert.equal(sessions.length, 1);
    assert.notEqual(sessions[0]._id, token);
    assert.equal(sessions[0]._id, createHash('sha256').update(token).digest('hex'));
  });

  it('reports every invalid field', async () => {
    const { response, body } = await register({ name: '  ', email: 'not-an-email', password: 'short' });

    assert.equal(response.status, 400);
    assert.deepEqual(Object.keys(body.error.fields).sort(), ['email', 'name', 'password']);
    assert.equal(sessionCookie(response), undefined);
    assert.equal(await User.countDocuments(), 0);
  });

  it('treats non-string values as missing', async () => {
    const { response, body } = await register({ ...account, email: { $gt: '' } });

    assert.equal(response.status, 400);
    assert.ok(body.error.fields.email);
  });

  it('rejects an email that is already registered, ignoring case', async () => {
    await register();
    const { response, body } = await register({ ...account, email: 'ASHA@example.com' });

    assert.equal(response.status, 409);
    assert.ok(body.error.fields.email);
    assert.equal(await User.countDocuments(), 1);
  });

  it('creates only one account when sign-ups race', async () => {
    const results = await Promise.all(Array.from({ length: 5 }, () => register()));
    const statuses = results.map(({ response }) => response.status).sort();

    assert.deepEqual(statuses, [201, 409, 409, 409, 409]);
    assert.equal(await User.countDocuments(), 1);
  });

  it('limits repeated sign-up attempts', async () => {
    for (let attempt = 0; attempt < 10; attempt += 1) {
      const { response } = await register({ name: '', email: '', password: '' });
      assert.equal(response.status, 400);
    }

    const { response, body } = await register();

    assert.equal(response.status, 429);
    assert.match(body.error.message, /Too many sign-up attempts/);
    assert.equal(await User.countDocuments(), 0);
  });

  it('rejects malformed JSON without a server error', async () => {
    const response = await fetch(`${server.baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{"email":',
    });

    assert.equal(response.status, 400);
    assert.ok((await response.json()).error.message);
  });
});

describe('POST /api/auth/login', () => {
  beforeEach(async () => {
    await register();
  });

  it('signs in with a normalized email', async () => {
    const response = await request('/api/auth/login', {
      method: 'POST',
      body: { email: ' ASHA@example.com', password: account.password },
    });
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(body.user.email, account.email);
    assert.equal(typeof body.csrfToken, 'string');
    assert.ok(sessionCookie(response));
  });

  it('gives the same answer for a wrong password and an unknown email', async () => {
    const wrongPassword = await request('/api/auth/login', {
      method: 'POST',
      body: { email: account.email, password: 'not the password' },
    });
    const unknownEmail = await request('/api/auth/login', {
      method: 'POST',
      body: { email: 'nobody@example.com', password: account.password },
    });

    assert.equal(wrongPassword.status, 401);
    assert.equal(unknownEmail.status, 401);
    assert.deepEqual(await wrongPassword.json(), await unknownEmail.json());
    assert.equal(sessionCookie(wrongPassword), undefined);
  });

  it('requires both fields', async () => {
    const response = await request('/api/auth/login', { method: 'POST', body: {} });

    assert.equal(response.status, 400);
    assert.deepEqual(Object.keys((await response.json()).error.fields).sort(), ['email', 'password']);
  });

  it('replaces the previous session', async () => {
    const first = await request('/api/auth/login', { method: 'POST', body: account });
    const oldCookie = sessionCookie(first);

    const second = await request('/api/auth/login', { method: 'POST', body: account, cookie: oldCookie });

    assert.notEqual(sessionCookie(second), oldCookie);
    assert.equal((await request('/api/auth/me', { cookie: oldCookie })).status, 401);
    assert.equal((await request('/api/auth/me', { cookie: sessionCookie(second) })).status, 200);
  });

  it('accepts the same password typed in a different Unicode form', async () => {
    await register({ name: 'Zoë', email: 'zoe@example.com', password: 'café au lait please' });

    const response = await request('/api/auth/login', {
      method: 'POST',
      body: { email: 'zoe@example.com', password: 'café au lait please' },
    });

    assert.equal(response.status, 200);
  });

  it('does not count validation errors towards the attempt limit', async () => {
    for (let attempt = 0; attempt < 12; attempt += 1) {
      assert.equal((await request('/api/auth/login', { method: 'POST', body: {} })).status, 400);
    }

    assert.equal((await request('/api/auth/login', { method: 'POST', body: account })).status, 200);
  });

  it('ignores X-Forwarded-For when counting attempts', async (t) => {
    // express-rate-limit warns about the header because trust proxy is off, which is the point here.
    t.mock.method(console, 'error', () => {});
    t.mock.method(console, 'warn', () => {});

    for (let attempt = 0; attempt < 10; attempt += 1) {
      await request('/api/auth/login', {
        method: 'POST',
        body: { email: account.email, password: `wrong password ${attempt}` },
        headers: { 'X-Forwarded-For': `203.0.113.${attempt}` },
      });
    }
    const blocked = await request('/api/auth/login', {
      method: 'POST',
      body: account,
      headers: { 'X-Forwarded-For': '198.51.100.7' },
    });

    assert.equal(blocked.status, 429);
  });

  it('blocks further attempts after repeated failures', async () => {
    for (let attempt = 0; attempt < 10; attempt += 1) {
      const response = await request('/api/auth/login', {
        method: 'POST',
        body: { email: account.email, password: `wrong password ${attempt}` },
      });
      assert.equal(response.status, 401);
    }

    const blocked = await request('/api/auth/login', { method: 'POST', body: account });

    assert.equal(blocked.status, 429);
    assert.match((await blocked.json()).error.message, /Too many failed sign-in attempts/);
  });
});

describe('GET /api/auth/me', () => {
  it('returns the signed-in user and CSRF token', async () => {
    const { cookie, body: registered } = await register();
    const response = await request('/api/auth/me', { cookie });
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.deepEqual(body.user, registered.user);
    assert.equal(body.csrfToken, registered.csrfToken);
  });

  it('rejects requests without a session cookie', async () => {
    const response = await request('/api/auth/me');

    assert.equal(response.status, 401);
    assert.equal((await response.json()).error.message, 'Sign in to continue.');
  });

  it('rejects an unknown session token', async () => {
    await register();
    const response = await request('/api/auth/me', { cookie: 'vb_session=forged-token' });

    assert.equal(response.status, 401);
  });

  it('rejects an expired session', async () => {
    const { cookie } = await register();
    await Session.updateMany({}, { expiresAt: new Date(Date.now() - 1000) });

    assert.equal((await request('/api/auth/me', { cookie })).status, 401);
  });

  it('treats JSON-prefixed and malformed cookie values as signed out', async () => {
    await register();

    // cookie-parser turns "j:" values into objects, which must never reach the session lookup.
    for (const value of ['j:{"$gt":""}', 'j:["x"]', '%E0%A4%A', '']) {
      const response = await request('/api/auth/me', { cookie: `vb_session=${value}` });
      assert.equal(response.status, 401, value);
    }
  });

  it('rejects the session of a deleted user', async () => {
    const { cookie } = await register();
    await User.deleteMany({});

    assert.equal((await request('/api/auth/me', { cookie })).status, 401);
  });
});

describe('POST /api/auth/logout', () => {
  it('requires the CSRF token', async () => {
    const { cookie } = await register();

    const missing = await request('/api/auth/logout', { method: 'POST', cookie });
    const wrong = await request('/api/auth/logout', { method: 'POST', cookie, csrfToken: 'x'.repeat(43) });

    assert.equal(missing.status, 403);
    assert.equal(wrong.status, 403);
    assert.equal((await request('/api/auth/me', { cookie })).status, 200);
  });

  it('rejects a CSRF token that belongs to another session', async () => {
    const first = await register();
    const second = await request('/api/auth/login', { method: 'POST', body: account });
    const { csrfToken: otherToken } = await second.json();

    const response = await request('/api/auth/logout', { method: 'POST', cookie: first.cookie, csrfToken: otherToken });

    assert.equal(response.status, 403);
    assert.equal(await Session.countDocuments(), 2);
  });

  it('ends the session on the server and clears the cookie', async () => {
    const { cookie, body } = await register();

    const response = await request('/api/auth/logout', { method: 'POST', cookie, csrfToken: body.csrfToken });

    assert.equal(response.status, 204);
    assert.match(sessionSetCookie(response), /Expires=Thu, 01 Jan 1970/);
    assert.equal(await Session.countDocuments(), 0);
    assert.equal((await request('/api/auth/me', { cookie })).status, 401, 'old cookie must not work again');
  });

  it('requires a session', async () => {
    const response = await request('/api/auth/logout', { method: 'POST' });

    assert.equal(response.status, 401);
  });
});

describe('cross-origin protection', () => {
  it('blocks a cross-site login even with valid credentials', async () => {
    await register();
    const response = await request('/api/auth/login', {
      method: 'POST',
      body: account,
      headers: { 'Sec-Fetch-Site': 'cross-site', Origin: 'https://attacker.example' },
    });

    assert.equal(response.status, 403);
    assert.equal(sessionCookie(response), undefined);
  });

  it('blocks a foreign Origin when Sec-Fetch-Site is absent', async () => {
    const response = await request('/api/auth/register', {
      method: 'POST',
      body: account,
      headers: { Origin: 'https://attacker.example' },
    });

    assert.equal(response.status, 403);
    assert.equal(await User.countDocuments(), 0);
  });

  it('blocks a cross-site logout even with the right CSRF token', async () => {
    const { cookie, body } = await register();
    const response = await request('/api/auth/logout', {
      method: 'POST',
      cookie,
      csrfToken: body.csrfToken,
      headers: { 'Sec-Fetch-Site': 'cross-site' },
    });

    assert.equal(response.status, 403);
    assert.equal(await Session.countDocuments(), 1);
  });

  it('rejects malformed fetch metadata', async () => {
    for (const fetchSite of ['garbage', 'Same-Origin', 'same-origin, cross-site']) {
      const response = await request('/api/auth/register', {
        method: 'POST',
        body: account,
        headers: { 'Sec-Fetch-Site': fetchSite },
      });
      assert.equal(response.status, 403, fetchSite);
    }
    assert.equal(await User.countDocuments(), 0);
  });

  it('ignores form-encoded sign-in attempts that an HTML form could send', async () => {
    await register();

    for (const [type, body] of [
      ['text/plain', JSON.stringify(account)],
      ['application/x-www-form-urlencoded', new URLSearchParams(account).toString()],
    ]) {
      const response = await fetch(`${server.baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': type },
        body,
      });
      assert.equal(response.status, 400, type);
      assert.equal(sessionCookie(response), undefined, type);
    }
  });

  it('allows same-origin browser requests', async () => {
    const response = await request('/api/auth/register', {
      method: 'POST',
      body: account,
      headers: { 'Sec-Fetch-Site': 'same-origin', Origin: 'http://localhost:5173' },
    });

    assert.equal(response.status, 201);
  });

  it('allows configured trusted origins', async () => {
    await server.close();
    server = await startTestServer({ TRUSTED_ORIGINS: 'http://localhost:5173' });

    const response = await request('/api/auth/register', {
      method: 'POST',
      body: account,
      headers: { Origin: 'http://localhost:5173' },
    });

    assert.equal(response.status, 201);
  });
});

describe('logging', () => {
  it('never writes passwords or session tokens to the console', async (t) => {
    const logged = [];
    for (const method of ['log', 'info', 'warn', 'error', 'debug']) {
      t.mock.method(console, method, (...args) => logged.push(args.map(String).join(' ')));
    }

    const { cookie, body } = await register();
    await request('/api/auth/login', { method: 'POST', body: { email: account.email, password: 'wrong password 1' } });
    await request('/api/auth/login', { method: 'POST', body: account });
    await request('/api/auth/logout', { method: 'POST', cookie, csrfToken: body.csrfToken });

    const output = logged.join('\n');
    for (const secret of [account.password, 'wrong password 1', cookie.split('=')[1], body.csrfToken]) {
      assert.ok(!output.includes(secret), `console output must not contain ${secret.slice(0, 4)}…`);
    }
  });
});

describe('production cookies', () => {
  it('marks the session cookie Secure', async () => {
    await server.close();
    server = await startTestServer({ NODE_ENV: 'production', MONGODB_URI: 'mongodb://127.0.0.1/unused' });

    const { response } = await register();

    assert.match(sessionSetCookie(response), /; Secure/i);
  });
});
