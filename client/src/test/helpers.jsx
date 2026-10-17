import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { vi } from 'vitest';
import App from '../App.jsx';

export const healthyBody = {
  status: 'ok',
  service: 'veribill-api',
  version: '0.1.0',
  uptimeSeconds: 3725,
  timestamp: '2026-01-15T09:30:00.000Z',
};

export const signedInBody = {
  user: { id: '6650f1c2a1b2c3d4e5f60718', name: 'Asha Verma', email: 'asha@example.com' },
  csrfToken: 'test-csrf-token',
};

export function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export function errorResponse(status, message, fields) {
  return jsonResponse({ error: fields ? { message, fields } : { message } }, status);
}

// Routes requests by "METHOD /path". Handlers return a fresh Response each call
// because a body can only be read once.
export function mockFetch(routes) {
  const fetchMock = vi.fn(async (url, options = {}) => {
    const key = `${options.method ?? 'GET'} ${url}`;
    const handler = routes[key];
    if (!handler) {
      throw new Error(`Unexpected request: ${key}`);
    }
    return handler(options);
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

export function renderApp(path = '/') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  );
}
