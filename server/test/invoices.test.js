import assert from 'node:assert/strict';
import { after, afterEach, before, beforeEach, describe, it } from 'node:test';
import { Invoice } from '../src/models/Invoice.js';
import { request, signUp } from './support/client.js';
import { clearDatabase, startTestDatabase, startTestServer } from './support/testServer.js';

const validInvoice = {
  invoiceNumber: 'INV-0042',
  supplierName: 'Acme Industrial Supplies',
  invoiceDate: '2026-10-05',
  dueDate: '2026-11-04',
};

let stopDatabase;
let server;
let alice;

before(async () => {
  stopDatabase = await startTestDatabase();
});

after(async () => {
  await stopDatabase();
});

beforeEach(async () => {
  await clearDatabase();
  server = await startTestServer();
  alice = await signUp(server.baseUrl, 'Alice');
});

afterEach(async () => {
  await server.close();
});

function api(path, options) {
  return request(server.baseUrl, path, options);
}

function createInvoice(session, overrides = {}) {
  return api('/api/invoices', { method: 'POST', session, body: { ...validInvoice, ...overrides } });
}

async function listInvoices(session, query = '') {
  const response = await api(`/api/invoices${query}`, { session });
  return { response, body: await response.json() };
}

describe('POST /api/invoices', () => {
  it('creates an invoice', async () => {
    const response = await createInvoice(alice, { currency: 'eur', status: 'pending_review', notes: 'Second delivery' });
    const { invoice } = await response.json();

    assert.equal(response.status, 201);
    assert.deepEqual(Object.keys(invoice).sort(), [
      'createdAt', 'currency', 'dueDate', 'id', 'invoiceDate', 'invoiceNumber', 'notes', 'status', 'supplierName', 'updatedAt',
    ]);
    assert.equal(invoice.invoiceNumber, 'INV-0042');
    assert.equal(invoice.invoiceDate, '2026-10-05');
    assert.equal(invoice.dueDate, '2026-11-04');
    assert.equal(invoice.currency, 'EUR');
    assert.equal(invoice.status, 'pending_review');
    assert.equal((await Invoice.findById(invoice.id).lean()).createdBy.toString(), alice.user.id);
  });

  it('treats the due date as optional and defaults to a draft in INR', async () => {
    const response = await createInvoice(alice, { dueDate: '' });
    const { invoice } = await response.json();

    assert.equal(response.status, 201);
    assert.equal(invoice.dueDate, null);
    assert.equal(invoice.currency, 'INR');
    assert.equal(invoice.status, 'draft');
  });

  it('reports every missing required field', async () => {
    const response = await api('/api/invoices', { method: 'POST', session: alice, body: {} });

    assert.equal(response.status, 400);
    assert.deepEqual(Object.keys((await response.json()).error.fields).sort(), [
      'invoiceDate', 'invoiceNumber', 'supplierName',
    ]);
  });

  it('rejects supplier names that are invisible or reorder displayed text', async () => {
    for (const supplierName of ['\u200B\u00AD', 'Acme \u202ELtd']) {
      const response = await createInvoice(alice, { supplierName });

      assert.equal(response.status, 400, JSON.stringify(supplierName));
      assert.deepEqual(Object.keys((await response.json()).error.fields), ['supplierName']);
    }
    assert.equal(await Invoice.countDocuments(), 0);
  });

  it('rejects a due date before the invoice date', async () => {
    const response = await createInvoice(alice, { dueDate: '2026-10-04' });

    assert.equal(response.status, 400);
    assert.deepEqual(Object.keys((await response.json()).error.fields), ['dueDate']);
  });

  it('accepts a due date on the invoice date', async () => {
    assert.equal((await createInvoice(alice, { dueDate: validInvoice.invoiceDate })).status, 201);
  });

  for (const status of ['matched', 'discrepancy_found', 'approved', 'rejected']) {
    it(`does not let a new invoice claim the "${status}" outcome`, async () => {
      const response = await createInvoice(alice, { status });

      assert.equal(response.status, 400);
      assert.ok((await response.json()).error.fields.status);
      assert.equal(await Invoice.countDocuments(), 0);
    });
  }

  it('rejects a repeated invoice number from the same supplier, ignoring case and spacing', async () => {
    await createInvoice(alice);
    const response = await createInvoice(alice, { invoiceNumber: 'inv-0042 ', supplierName: 'ACME  industrial supplies' });

    assert.equal(response.status, 409);
    assert.ok((await response.json()).error.fields.invoiceNumber);
    assert.equal(await Invoice.countDocuments(), 1);
  });

  it('allows the same invoice number from a different supplier', async () => {
    await createInvoice(alice);

    assert.equal((await createInvoice(alice, { supplierName: 'Acme Industrial Supplies Pvt Ltd' })).status, 201);
    assert.equal((await createInvoice(alice, { supplierName: 'Bharat Steel Works' })).status, 201);
  });

  it('allows different users to record the same supplier invoice', async () => {
    const bob = await signUp(server.baseUrl, 'Bob');
    await createInvoice(alice);

    assert.equal((await createInvoice(bob)).status, 201);
  });

  it('requires a session and the CSRF token', async () => {
    const anonymous = await createInvoice(undefined);
    const withoutToken = await api('/api/invoices', { method: 'POST', session: alice, csrf: false, body: validInvoice });

    assert.equal(anonymous.status, 401);
    assert.equal(withoutToken.status, 403);
    assert.equal(await Invoice.countDocuments(), 0);
  });
});

describe('GET /api/invoices', () => {
  it('requires a session', async () => {
    assert.equal((await api('/api/invoices')).status, 401);
  });

  it('searches, filters and paginates the user’s invoices', async () => {
    await createInvoice(alice, { invoiceNumber: 'INV-1', supplierName: 'Acme Industrial Supplies' });
    await createInvoice(alice, { invoiceNumber: 'INV-2', supplierName: 'Bharat Steel Works', status: 'pending_review' });
    await createInvoice(alice, { invoiceNumber: 'INV-3', supplierName: 'Bharat Steel Works', status: 'pending_review' });

    const { body: firstPage } = await listInvoices(alice, '?limit=2');
    const { body: secondPage } = await listInvoices(alice, '?limit=2&page=2');
    const { body: bySupplier } = await listInvoices(alice, '?search=bharat&status=pending_review');
    const { body: byNumber } = await listInvoices(alice, '?search=inv-1');

    assert.deepEqual(firstPage.invoices.map((invoice) => invoice.invoiceNumber), ['INV-3', 'INV-2']);
    assert.deepEqual(secondPage.invoices.map((invoice) => invoice.invoiceNumber), ['INV-1']);
    assert.deepEqual(firstPage.pagination, { page: 1, limit: 2, total: 3, totalPages: 2 });
    assert.deepEqual(bySupplier.invoices.map((invoice) => invoice.invoiceNumber), ['INV-3', 'INV-2']);
    assert.deepEqual(byNumber.invoices.map((invoice) => invoice.invoiceNumber), ['INV-1']);
  });

  it('accepts every invoice status as a filter, including later workflow outcomes', async () => {
    await createInvoice(alice);

    const { response, body } = await listInvoices(alice, '?status=matched');

    assert.equal(response.status, 200);
    assert.deepEqual(body.invoices, []);
  });

  it('rejects invalid query parameters', async () => {
    for (const query of ['?status=paid', '?limit=500', '?page=0']) {
      const { response } = await listInvoices(alice, query);
      assert.equal(response.status, 400, query);
    }
  });

  it('rejects a search containing a NUL byte', async () => {
    for (const search of ['%00', 'INV%00']) {
      const { response, body } = await listInvoices(alice, `?search=${search}`);

      assert.equal(response.status, 400, search);
      assert.deepEqual(body.error, {
        message: 'Invalid query parameters.',
        fields: { search: 'Remove the unsupported characters.' },
      });
    }
  });

  it('only lists the signed-in user’s invoices', async () => {
    const bob = await signUp(server.baseUrl, 'Bob');
    await createInvoice(bob);

    const { body } = await listInvoices(alice);

    assert.deepEqual(body.invoices, []);
    assert.equal(body.pagination.total, 0);
  });
});

describe('GET /api/invoices/:id', () => {
  it('returns the invoice to its owner and hides it from everyone else', async () => {
    const bob = await signUp(server.baseUrl, 'Bob');
    const created = (await (await createInvoice(alice)).json()).invoice;

    const own = await api(`/api/invoices/${created.id}`, { session: alice });
    const others = await api(`/api/invoices/${created.id}`, { session: bob });

    assert.equal(own.status, 200);
    assert.deepEqual((await own.json()).invoice, created);
    assert.equal(others.status, 404);
    assert.equal((await others.json()).error.message, 'Invoice not found.');
  });

  it('rejects malformed ids and requires a session', async () => {
    const malformed = await api('/api/invoices/not-an-id', { session: alice });
    const anonymous = await api(`/api/invoices/${'0'.repeat(24)}`);

    assert.equal(malformed.status, 400);
    assert.equal(anonymous.status, 401);
  });
});
