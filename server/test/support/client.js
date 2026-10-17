let accountCount = 0;

// Sends a JSON request the way the web client does. With a session, the cookie is
// attached, and so is the CSRF token on state-changing requests unless csrf is false.
export function request(baseUrl, path, { method = 'GET', body, session, csrf = true, headers = {} } = {}) {
  return fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      ...(body !== undefined && { 'Content-Type': 'application/json' }),
      ...(session && { Cookie: session.cookie }),
      ...(session && csrf && method !== 'GET' && { 'X-CSRF-Token': session.csrfToken }),
      ...headers,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

export async function signUp(baseUrl, name) {
  accountCount += 1;
  const response = await request(baseUrl, '/api/auth/register', {
    method: 'POST',
    body: { name, email: `user${accountCount}@example.com`, password: 'correct horse battery' },
  });
  if (response.status !== 201) {
    throw new Error(`Sign-up failed with HTTP ${response.status}`);
  }

  const { user, csrfToken } = await response.json();
  const cookie = response.headers
    .getSetCookie()
    .find((header) => header.startsWith('vb_session='))
    .split(';')[0];
  return { user, csrfToken, cookie };
}
