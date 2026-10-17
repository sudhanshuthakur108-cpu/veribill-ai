import { fireEvent, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import {
  errorResponse,
  healthyBody,
  invoiceFixture,
  jsonResponse,
  listResponse,
  mockFetch,
  renderApp,
  signedInBody,
} from '../test/helpers.jsx';

const signedIn = () => jsonResponse(signedInBody);
const healthy = () => jsonResponse(healthyBody);

function fillIn(label, value) {
  fireEvent.change(screen.getByLabelText(label), { target: { value } });
}

describe('InvoicesPage', () => {
  it('lists invoices from the API', async () => {
    mockFetch({
      'GET /api/auth/me': signedIn,
      'GET /api/health': healthy,
      'GET /api/invoices': () =>
        listResponse('invoices', [
          invoiceFixture(),
          invoiceFixture({ id: '6650f1c2a1b2c3d4e5f60902', invoiceNumber: 'INV-0043', dueDate: null, status: 'draft' }),
        ]),
    });

    renderApp('/invoices');

    const link = await screen.findByRole('link', { name: 'INV-0042' });
    expect(link).toHaveAttribute('href', '/invoices/6650f1c2a1b2c3d4e5f60901');
    const rowWithoutDueDate = screen.getByRole('link', { name: 'INV-0043' }).closest('tr');
    expect(within(rowWithoutDueDate).getByText('—')).toBeInTheDocument();
    expect(within(screen.getByRole('table')).getByText('Pending review')).toBeInTheDocument();
  });

  it('filters by any invoice status, including later workflow outcomes', async () => {
    const queries = [];
    mockFetch({
      'GET /api/auth/me': signedIn,
      'GET /api/health': healthy,
      'GET /api/invoices': (options, query) => {
        queries.push(query.toString());
        return listResponse('invoices', []);
      },
    });

    renderApp('/invoices');
    await screen.findByText('No invoices yet.');
    fillIn('Status', 'discrepancy_found');

    expect(await screen.findByText('No invoices match your search or filter.')).toBeInTheDocument();
    expect(queries.at(-1)).toBe('page=1&status=discrepancy_found');
  });
});

describe('NewInvoicePage', () => {
  it('only offers the statuses a new invoice can have', async () => {
    mockFetch({ 'GET /api/auth/me': signedIn, 'GET /api/health': healthy });

    renderApp('/invoices/new');

    const status = await screen.findByLabelText('Status');
    expect(within(status).getAllByRole('option').map((option) => option.textContent)).toEqual([
      'Draft',
      'Pending review',
    ]);
  });

  it('rejects a due date before the invoice date without calling the API', async () => {
    const fetchMock = mockFetch({ 'GET /api/auth/me': signedIn, 'GET /api/health': healthy });
    renderApp('/invoices/new');
    await screen.findByRole('heading', { name: 'New invoice' });

    fillIn('Invoice number', 'INV-0042');
    fillIn('Supplier name', 'Acme Industrial Supplies');
    fillIn('Invoice date', '2026-10-05');
    fillIn('Due date (optional)', '2026-10-01');
    fireEvent.click(screen.getByRole('button', { name: 'Save invoice' }));

    expect(screen.getByText('The due date cannot be before the invoice date.')).toBeInTheDocument();
    expect(fetchMock.mock.calls.some(([, options]) => options?.method === 'POST')).toBe(false);
  });

  it('saves the invoice and opens it', async () => {
    const fetchMock = mockFetch({
      'GET /api/auth/me': signedIn,
      'GET /api/health': healthy,
      'POST /api/invoices': () => jsonResponse({ invoice: invoiceFixture({ dueDate: null }) }, 201),
      'GET /api/invoices/6650f1c2a1b2c3d4e5f60901': () => jsonResponse({ invoice: invoiceFixture({ dueDate: null }) }),
    });
    renderApp('/invoices/new');
    await screen.findByRole('heading', { name: 'New invoice' });

    fillIn('Invoice number', 'INV-0042');
    fillIn('Supplier name', 'Acme Industrial Supplies');
    fillIn('Invoice date', '2026-10-05');
    fillIn('Status', 'pending_review');
    fireEvent.click(screen.getByRole('button', { name: 'Save invoice' }));

    expect(await screen.findByText('Invoice saved.')).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Invoice details' })).toHaveTextContent('Not set');

    const [, options] = fetchMock.mock.calls.find(([, init]) => init?.method === 'POST');
    expect(JSON.parse(options.body)).toEqual({
      invoiceNumber: 'INV-0042',
      supplierName: 'Acme Industrial Supplies',
      invoiceDate: '2026-10-05',
      dueDate: '',
      currency: 'INR',
      status: 'pending_review',
      notes: '',
    });
  });

  it('shows a duplicate-number error from the server on the invoice number', async () => {
    mockFetch({
      'GET /api/auth/me': signedIn,
      'GET /api/health': healthy,
      'POST /api/invoices': () =>
        errorResponse(409, 'An invoice with this number already exists for this supplier.', {
          invoiceNumber: 'You already have an invoice with this number from this supplier.',
        }),
    });
    renderApp('/invoices/new');
    await screen.findByRole('heading', { name: 'New invoice' });

    fillIn('Invoice number', 'INV-0042');
    fillIn('Supplier name', 'Acme Industrial Supplies');
    fillIn('Invoice date', '2026-10-05');
    fireEvent.click(screen.getByRole('button', { name: 'Save invoice' }));

    expect(await screen.findByLabelText('Invoice number')).toHaveAccessibleDescription(
      'You already have an invoice with this number from this supplier.',
    );
  });
});

describe('InvoiceDetailPage', () => {
  it('offers a retry when loading fails', async () => {
    let calls = 0;
    mockFetch({
      'GET /api/auth/me': signedIn,
      'GET /api/health': healthy,
      'GET /api/invoices/6650f1c2a1b2c3d4e5f60901': () => {
        calls += 1;
        return calls === 1 ? errorResponse(503, 'Service unavailable') : jsonResponse({ invoice: invoiceFixture() });
      },
    });

    renderApp('/invoices/6650f1c2a1b2c3d4e5f60901');
    fireEvent.click(await screen.findByRole('button', { name: 'Try again' }));

    const details = await screen.findByRole('region', { name: 'Invoice details' });
    expect(details).toHaveTextContent('4 Nov 2026');
    expect(screen.getByRole('heading', { name: 'Invoice INV-0042' })).toBeInTheDocument();
  });
});
