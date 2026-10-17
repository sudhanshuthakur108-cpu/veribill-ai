import { fireEvent, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import {
  errorResponse,
  healthyBody,
  jsonResponse,
  listResponse,
  mockFetch,
  purchaseOrderFixture,
  renderApp,
  signedInBody,
} from '../test/helpers.jsx';

const signedIn = () => jsonResponse(signedInBody);
const healthy = () => jsonResponse(healthyBody);

function fillIn(label, value) {
  fireEvent.change(screen.getByLabelText(label), { target: { value } });
}

describe('PurchaseOrdersPage', () => {
  it('shows a loading state, then the purchase orders from the API', async () => {
    let respond;
    mockFetch({
      'GET /api/auth/me': signedIn,
      'GET /api/health': healthy,
      'GET /api/purchase-orders': () => new Promise((resolve) => (respond = resolve)),
    });

    renderApp('/purchase-orders');
    expect(await screen.findByText('Loading purchase orders…')).toBeInTheDocument();

    respond(
      listResponse('purchaseOrders', [
        purchaseOrderFixture(),
        purchaseOrderFixture({ id: '6650f1c2a1b2c3d4e5f60802', poNumber: 'PO-2026-002', status: 'partially_received' }),
      ]),
    );

    const link = await screen.findByRole('link', { name: 'PO-2026-001' });
    expect(link).toHaveAttribute('href', '/purchase-orders/6650f1c2a1b2c3d4e5f60801');
    expect(within(screen.getByRole('table')).getByText('Partially received')).toBeInTheDocument();
    expect(screen.getAllByText('1 Oct 2026')).toHaveLength(2);
    expect(screen.getByText('2 purchase orders · Page 1 of 1')).toBeInTheDocument();
  });

  it('offers to create the first record when there are none', async () => {
    mockFetch({
      'GET /api/auth/me': signedIn,
      'GET /api/health': healthy,
      'GET /api/purchase-orders': () => listResponse('purchaseOrders', []),
    });

    renderApp('/purchase-orders');

    expect(await screen.findByText('No purchase orders yet.')).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: 'New purchase order' })).toHaveLength(2);
  });

  it('explains a failed load and retries', async () => {
    let calls = 0;
    mockFetch({
      'GET /api/auth/me': signedIn,
      'GET /api/health': healthy,
      'GET /api/purchase-orders': () => {
        calls += 1;
        return calls === 1
          ? errorResponse(500, 'Internal server error')
          : listResponse('purchaseOrders', [purchaseOrderFixture()]);
      },
    });

    renderApp('/purchase-orders');

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Could not load purchase orders.');
    expect(alert).toHaveTextContent('Internal server error');

    fireEvent.click(within(alert).getByRole('button', { name: 'Try again' }));

    expect(await screen.findByRole('link', { name: 'PO-2026-001' })).toBeInTheDocument();
  });

  it('sends search, status and page changes to the API', async () => {
    const queries = [];
    mockFetch({
      'GET /api/auth/me': signedIn,
      'GET /api/health': healthy,
      'GET /api/purchase-orders': (options, query) => {
        queries.push(query.toString());
        const page = Number(query.get('page') ?? 1);
        return listResponse('purchaseOrders', [purchaseOrderFixture({ poNumber: `PO-PAGE-${page}` })], { page, total: 45 });
      },
    });

    renderApp('/purchase-orders');
    await screen.findByText('PO-PAGE-1');
    expect(screen.getByRole('button', { name: 'Previous' })).toBeDisabled();

    fillIn('Search purchase orders', '  acme ');
    fireEvent.click(screen.getByRole('button', { name: 'Search' }));
    await screen.findByText('45 purchase orders · Page 1 of 3');
    expect(queries.at(-1)).toBe('page=1&search=acme');

    fillIn('Status', 'open');
    await screen.findByText('PO-PAGE-1');
    expect(queries.at(-1)).toBe('page=1&search=acme&status=open');

    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(await screen.findByText('PO-PAGE-2')).toBeInTheDocument();
    expect(queries.at(-1)).toBe('page=2&search=acme&status=open');

    fireEvent.click(screen.getByRole('button', { name: 'Clear' }));
    expect(await screen.findByText('PO-PAGE-1')).toBeInTheDocument();
    expect(queries.at(-1)).toBe('page=1&status=open');
    expect(screen.getByLabelText('Search purchase orders')).toHaveValue('');
  });

  it('offers to clear filters when nothing matches', async () => {
    mockFetch({
      'GET /api/auth/me': signedIn,
      'GET /api/health': healthy,
      'GET /api/purchase-orders': (options, query) =>
        query.has('search') ? listResponse('purchaseOrders', []) : listResponse('purchaseOrders', [purchaseOrderFixture()]),
    });

    renderApp('/purchase-orders?search=nothing-like-this');
    fireEvent.click(await screen.findByRole('button', { name: 'Clear search and filter' }));

    expect(await screen.findByRole('link', { name: 'PO-2026-001' })).toBeInTheDocument();
  });

  it('ignores page and status values in the URL that the API would reject', async () => {
    const queries = [];
    mockFetch({
      'GET /api/auth/me': signedIn,
      'GET /api/health': healthy,
      'GET /api/purchase-orders': (options, query) => {
        queries.push(query.toString());
        return listResponse('purchaseOrders', [purchaseOrderFixture()]);
      },
    });

    renderApp('/purchase-orders?page=abc&status=shipped');

    await screen.findByRole('link', { name: 'PO-2026-001' });
    expect(queries).toEqual(['page=1']);
  });

  it('returns to sign-in when the session has expired', async () => {
    mockFetch({
      'GET /api/auth/me': signedIn,
      'GET /api/health': healthy,
      'GET /api/purchase-orders': () => errorResponse(401, 'Sign in to continue.'),
    });

    renderApp('/purchase-orders');

    expect(await screen.findByRole('heading', { name: 'Sign in' })).toBeInTheDocument();
  });
});

describe('NewPurchaseOrderPage', () => {
  function renderForm(createHandler) {
    return mockFetch({
      'GET /api/auth/me': signedIn,
      'GET /api/health': healthy,
      'POST /api/purchase-orders': createHandler,
      'GET /api/purchase-orders/6650f1c2a1b2c3d4e5f60801': () =>
        jsonResponse({ purchaseOrder: purchaseOrderFixture({ notes: 'Deliver to gate 2' }) }),
    });
  }

  function fillValidOrder() {
    fillIn('PO number', 'PO-2026-001');
    fillIn('Supplier name', 'Acme Industrial Supplies');
    fillIn('Issue date', '2026-10-01');
    fillIn('Status', 'open');
    fillIn('Notes (optional)', 'Deliver to gate 2');
  }

  it('checks required fields before sending anything', async () => {
    const fetchMock = renderForm(() => {
      throw new Error('should not be called');
    });
    renderApp('/purchase-orders/new');

    fireEvent.click(await screen.findByRole('button', { name: 'Save purchase order' }));

    expect(screen.getByText('Enter the PO number.')).toBeInTheDocument();
    expect(screen.getByText('Enter the supplier name.')).toBeInTheDocument();
    expect(screen.getByText('Enter the issue date.')).toBeInTheDocument();
    expect(screen.getByLabelText('PO number')).toHaveAttribute('aria-invalid', 'true');
    expect(fetchMock.mock.calls.some(([, options]) => options?.method === 'POST')).toBe(false);
  });

  it('saves the purchase order and opens it', async () => {
    const fetchMock = renderForm(() => jsonResponse({ purchaseOrder: purchaseOrderFixture() }, 201));
    renderApp('/purchase-orders/new');
    await screen.findByRole('heading', { name: 'New purchase order' });

    fillValidOrder();
    fireEvent.click(screen.getByRole('button', { name: 'Save purchase order' }));

    expect(await screen.findByText('Purchase order saved.')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Purchase order PO-2026-001' })).toBeInTheDocument();
    expect(screen.getByText('Deliver to gate 2')).toBeInTheDocument();

    const [, options] = fetchMock.mock.calls.find(([, init]) => init?.method === 'POST');
    expect(options.headers['X-CSRF-Token']).toBe('test-csrf-token');
    expect(JSON.parse(options.body)).toEqual({
      poNumber: 'PO-2026-001',
      supplierName: 'Acme Industrial Supplies',
      issueDate: '2026-10-01',
      currency: 'INR',
      status: 'open',
      notes: 'Deliver to gate 2',
    });
  });

  it('shows server errors next to the field they belong to', async () => {
    renderForm(() =>
      errorResponse(409, 'A purchase order with this number already exists.', {
        poNumber: 'You already have a purchase order with this number.',
      }),
    );
    renderApp('/purchase-orders/new');
    await screen.findByRole('heading', { name: 'New purchase order' });

    fillValidOrder();
    fireEvent.click(screen.getByRole('button', { name: 'Save purchase order' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('A purchase order with this number already exists.');
    const field = screen.getByLabelText('PO number');
    expect(field).toHaveAttribute('aria-invalid', 'true');
    expect(field).toHaveAccessibleDescription('You already have a purchase order with this number.');
    expect(screen.getByRole('button', { name: 'Save purchase order' })).toBeEnabled();
  });

  it('sends only one request when submitted twice quickly', async () => {
    const fetchMock = renderForm(() => new Promise(() => {}));
    renderApp('/purchase-orders/new');
    await screen.findByRole('heading', { name: 'New purchase order' });

    fillValidOrder();
    const form = screen.getByRole('button', { name: 'Save purchase order' }).closest('form');
    fireEvent.submit(form);
    fireEvent.submit(form);

    expect(await screen.findByRole('button', { name: 'Saving…' })).toBeDisabled();
    expect(fetchMock.mock.calls.filter(([, init]) => init?.method === 'POST')).toHaveLength(1);
  });
});

describe('PurchaseOrderDetailPage', () => {
  it('shows the record', async () => {
    mockFetch({
      'GET /api/auth/me': signedIn,
      'GET /api/health': healthy,
      'GET /api/purchase-orders/6650f1c2a1b2c3d4e5f60801': () =>
        jsonResponse({ purchaseOrder: purchaseOrderFixture({ currency: 'USD' }) }),
    });

    renderApp('/purchase-orders/6650f1c2a1b2c3d4e5f60801');

    const details = await screen.findByRole('region', { name: 'Purchase order details' });
    expect(details).toHaveTextContent('Acme Industrial Supplies');
    expect(details).toHaveTextContent('1 Oct 2026');
    expect(details).toHaveTextContent('USD');
    expect(details).toHaveTextContent('Open');
    expect(details).toHaveTextContent('None');
    expect(screen.queryByText('Purchase order saved.')).not.toBeInTheDocument();
  });

  it('says when a record cannot be found', async () => {
    mockFetch({
      'GET /api/auth/me': signedIn,
      'GET /api/health': healthy,
      'GET /api/purchase-orders/6650f1c2a1b2c3d4e5f60899': () => errorResponse(404, 'Purchase order not found.'),
    });

    renderApp('/purchase-orders/6650f1c2a1b2c3d4e5f60899');

    expect(await screen.findByRole('alert')).toHaveTextContent('Purchase order not found.');
    expect(screen.getByRole('link', { name: '← All purchase orders' })).toBeInTheDocument();
  });
});

describe('navigation', () => {
  it('links the main sections and marks the current one', async () => {
    mockFetch({
      'GET /api/auth/me': signedIn,
      'GET /api/health': healthy,
      'GET /api/purchase-orders': () => listResponse('purchaseOrders', []),
    });

    renderApp('/purchase-orders');

    const nav = await screen.findByRole('navigation', { name: 'Main' });
    expect(within(nav).getByRole('link', { name: 'Purchase orders' })).toHaveAttribute('aria-current', 'page');
    expect(within(nav).getByRole('link', { name: 'Invoices' })).toHaveAttribute('href', '/invoices');
    expect(within(nav).getByRole('link', { name: 'Dashboard' })).not.toHaveAttribute('aria-current');
  });
});
