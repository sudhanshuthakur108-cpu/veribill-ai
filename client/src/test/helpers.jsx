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

export function purchaseOrderFixture(overrides = {}) {
  return {
    id: '6650f1c2a1b2c3d4e5f60801',
    poNumber: 'PO-2026-001',
    supplierName: 'Acme Industrial Supplies',
    issueDate: '2026-10-01',
    currency: 'INR',
    status: 'open',
    notes: null,
    createdAt: '2026-10-02T09:15:00.000Z',
    updatedAt: '2026-10-02T09:15:00.000Z',
    ...overrides,
  };
}

export function invoiceFixture(overrides = {}) {
  return {
    id: '6650f1c2a1b2c3d4e5f60901',
    invoiceNumber: 'INV-0042',
    supplierName: 'Acme Industrial Supplies',
    invoiceDate: '2026-10-05',
    dueDate: '2026-11-04',
    currency: 'INR',
    status: 'pending_review',
    notes: null,
    createdAt: '2026-10-06T11:00:00.000Z',
    updatedAt: '2026-10-06T11:00:00.000Z',
    ...overrides,
  };
}

export function listResponse(key, items, { page = 1, limit = 20, total = items.length } = {}) {
  return jsonResponse({ [key]: items, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
}

export function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export function errorResponse(status, message, fields) {
  return jsonResponse({ error: fields ? { message, fields } : { message } }, status);
}

// Routes requests by "METHOD /path", ignoring the query string, which handlers get
// as a URLSearchParams. Handlers return a fresh Response each call because a body
// can only be read once.
export function mockFetch(routes) {
  const fetchMock = vi.fn(async (url, options = {}) => {
    const [path, query = ''] = url.split('?');
    const key = `${options.method ?? 'GET'} ${path}`;
    const handler = routes[key];
    if (!handler) {
      throw new Error(`Unexpected request: ${key}`);
    }
    return handler(options, new URLSearchParams(query));
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
