import assert from 'node:assert/strict';
import { after, afterEach, before, beforeEach, describe, it } from 'node:test';
import mongoose from 'mongoose';
import { lookupKey } from '../src/documents/normalize.js';
import { PurchaseOrder } from '../src/models/PurchaseOrder.js';
import { request, signUp } from './support/client.js';
import { clearDatabase, startTestDatabase, startTestServer } from './support/testServer.js';

const validOrder = { poNumber: 'PO-2026-001', supplierName: 'Acme Industrial Supplies', issueDate: '2026-10-01' };

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

function createOrder(session, overrides = {}) {
  return api('/api/purchase-orders', { method: 'POST', session, body: { ...validOrder, ...overrides } });
}

async function listOrders(session, query = '') {
  const response = await api(`/api/purchase-orders${query}`, { session });
  return { response, body: await response.json() };
}

describe('POST /api/purchase-orders', () => {
  it('creates a purchase order with cleaned values and defaults', async () => {
    const response = await createOrder(alice, {
      poNumber: '  PO-2026-001 ',
      supplierName: ' Acme   Industrial Supplies ',
    });
    const { purchaseOrder } = await response.json();

    assert.equal(response.status, 201);
    assert.equal(response.headers.get('cache-control'), 'no-store');
    assert.deepEqual(Object.keys(purchaseOrder).sort(), [
      'createdAt', 'currency', 'id', 'issueDate', 'notes', 'poNumber', 'status', 'supplierName', 'updatedAt',
    ]);
    assert.equal(purchaseOrder.poNumber, 'PO-2026-001');
    assert.equal(purchaseOrder.supplierName, 'Acme Industrial Supplies');
    assert.equal(purchaseOrder.issueDate, '2026-10-01');
    assert.equal(purchaseOrder.currency, 'INR');
    assert.equal(purchaseOrder.status, 'draft');
    assert.equal(purchaseOrder.notes, null);

    const stored = await PurchaseOrder.findById(purchaseOrder.id).lean();
    assert.equal(stored.createdBy.toString(), alice.user.id);
    assert.equal(stored.poNumberKey, 'po-2026-001');
    assert.equal(stored.supplierKey, 'acme industrial supplies');
  });

  it('accepts the optional fields', async () => {
    const response = await createOrder(alice, { currency: 'usd', status: 'partially_received', notes: '  Ship in two lots.\nCall first.  ' });
    const { purchaseOrder } = await response.json();

    assert.equal(response.status, 201);
    assert.equal(purchaseOrder.currency, 'USD');
    assert.equal(purchaseOrder.status, 'partially_received');
    assert.equal(purchaseOrder.notes, 'Ship in two lots.\nCall first.');
  });

  it('ignores fields the client is not allowed to set', async () => {
    const bob = await signUp(server.baseUrl, 'Bob');
    const response = await createOrder(alice, {
      _id: '0123456789abcdef01234567',
      createdBy: bob.user.id,
      poNumberKey: 'something-else',
      createdAt: '2000-01-01T00:00:00.000Z',
    });
    const { purchaseOrder } = await response.json();
    const stored = await PurchaseOrder.findById(purchaseOrder.id).lean();

    assert.equal(response.status, 201);
    assert.notEqual(purchaseOrder.id, '0123456789abcdef01234567');
    assert.equal(stored.createdBy.toString(), alice.user.id);
    assert.equal(stored.poNumberKey, 'po-2026-001');
    assert.ok(stored.createdAt > new Date('2020-01-01'));
  });

  it('reports every missing required field', async () => {
    const response = await api('/api/purchase-orders', { method: 'POST', session: alice, body: {} });
    const { error } = await response.json();

    assert.equal(response.status, 400);
    assert.deepEqual(Object.keys(error.fields).sort(), ['issueDate', 'poNumber', 'supplierName']);
  });

  for (const [field, value] of [
    ['poNumber', '#PO-1'],
    ['poNumber', 'PO 1 <script>'],
    ['poNumber', 'P'.repeat(51)],
    ['supplierName', 'S'.repeat(201)],
    ['supplierName', 'Acme\u0000Ltd'],
    ['supplierName', '\u200B'],
    ['supplierName', '\u00AD'],
    ['supplierName', ' \u200B \u200C\u00AD '],
    ['supplierName', '\u202EsrepuS emcA'],
    ['supplierName', 'Acme \u2066Ltd\u2069'],
    ['issueDate', '2026-02-30'],
    ['issueDate', '01/10/2026'],
    ['issueDate', '1899-12-31'],
    ['currency', 'XYZ'],
    ['currency', 'RUPEES'],
    ['status', 'shipped'],
    ['notes', 'n'.repeat(2001)],
  ]) {
    it(`rejects ${field}=${JSON.stringify(value).slice(0, 24)}`, async () => {
      const response = await createOrder(alice, { [field]: value });
      const { error } = await response.json();

      assert.equal(response.status, 400);
      assert.deepEqual(Object.keys(error.fields), [field]);
      assert.equal(await PurchaseOrder.countDocuments(), 0);
    });
  }

  it('accepts Indic-script supplier names that use ZWJ or ZWNJ', async () => {
    for (const [poNumber, supplierName] of [
      ['PO-ZWJ', 'क्\u200Dष ट्रेडर्स'],
      ['PO-ZWNJ', 'ശ്രീ\u200Cകൃഷ്ണ എന്റർപ്രൈസസ്'],
    ]) {
      const response = await createOrder(alice, { poNumber, supplierName });

      assert.equal(response.status, 201, supplierName);
      assert.equal((await response.json()).purchaseOrder.supplierName, supplierName);
    }
  });

  it('rejects values that are not strings, including query operators', async () => {
    const response = await createOrder(alice, {
      poNumber: { $gt: '' },
      supplierName: ['Acme'],
      issueDate: 20261001,
      status: { $ne: null },
    });
    const { error } = await response.json();

    assert.equal(response.status, 400);
    assert.deepEqual(Object.keys(error.fields).sort(), ['issueDate', 'poNumber', 'status', 'supplierName']);
  });

  it('rejects a duplicate PO number, ignoring case and spacing', async () => {
    await createOrder(alice);
    const response = await createOrder(alice, { poNumber: ' po-2026-001', supplierName: 'Another Supplier' });
    const { error } = await response.json();

    assert.equal(response.status, 409);
    assert.ok(error.fields.poNumber);
    assert.equal(await PurchaseOrder.countDocuments(), 1);
  });

  it('allows different users to use the same PO number', async () => {
    const bob = await signUp(server.baseUrl, 'Bob');
    await createOrder(alice);

    assert.equal((await createOrder(bob)).status, 201);
  });

  it('requires a session', async () => {
    const response = await createOrder(undefined);

    assert.equal(response.status, 401);
    assert.equal(await PurchaseOrder.countDocuments(), 0);
  });

  it('requires the CSRF token', async () => {
    const response = await api('/api/purchase-orders', { method: 'POST', session: alice, csrf: false, body: validOrder });

    assert.equal(response.status, 403);
    assert.equal(await PurchaseOrder.countDocuments(), 0);
  });

  it('rejects cross-site requests even with a valid token', async () => {
    const response = await api('/api/purchase-orders', {
      method: 'POST',
      session: alice,
      body: validOrder,
      headers: { 'Sec-Fetch-Site': 'cross-site', Origin: 'https://attacker.example' },
    });

    assert.equal(response.status, 403);
  });
});

describe('GET /api/purchase-orders', () => {
  it('requires a session', async () => {
    assert.equal((await api('/api/purchase-orders')).status, 401);
  });

  it('lists the newest records first with pagination details', async () => {
    for (const poNumber of ['PO-1', 'PO-2', 'PO-3']) {
      await createOrder(alice, { poNumber });
    }

    const { response, body } = await listOrders(alice);

    assert.equal(response.status, 200);
    assert.deepEqual(body.purchaseOrders.map((order) => order.poNumber), ['PO-3', 'PO-2', 'PO-1']);
    assert.deepEqual(body.pagination, { page: 1, limit: 20, total: 3, totalPages: 1 });
  });

  it('pages through records without gaps or repeats when timestamps tie', async () => {
    const createdAt = new Date('2026-10-01T10:00:00.000Z');
    await PurchaseOrder.collection.insertMany(
      Array.from({ length: 15 }, (_, index) => ({
        createdBy: new mongoose.Types.ObjectId(alice.user.id),
        poNumber: `PO-${index}`,
        poNumberKey: lookupKey(`PO-${index}`),
        supplierName: 'Acme',
        supplierKey: 'acme',
        issueDate: new Date('2026-10-01'),
        currency: 'INR',
        status: 'draft',
        createdAt,
        updatedAt: createdAt,
      })),
    );

    const seen = [];
    for (let page = 1; page <= 4; page += 1) {
      const { body } = await listOrders(alice, `?limit=4&page=${page}`);
      assert.equal(body.pagination.totalPages, 4);
      seen.push(...body.purchaseOrders.map((order) => order.id));
    }
    const { body: oldestFirst } = await listOrders(alice, '?limit=15&sort=oldest');

    assert.equal(seen.length, 15);
    assert.equal(new Set(seen).size, 15);
    assert.deepEqual(oldestFirst.purchaseOrders.map((order) => order.id), [...seen].reverse());
  });

  it('caps the page size and reports an empty page past the end', async () => {
    await createOrder(alice);

    const { body } = await listOrders(alice, '?page=3&limit=100');

    assert.deepEqual(body.purchaseOrders, []);
    assert.deepEqual(body.pagination, { page: 3, limit: 100, total: 1, totalPages: 1 });
  });

  it('searches PO numbers and supplier names, ignoring case', async () => {
    await createOrder(alice, { poNumber: 'PO-100', supplierName: 'Acme Industrial Supplies' });
    await createOrder(alice, { poNumber: 'PO-200', supplierName: 'Bharat Steel Works' });

    const numbers = async (search) =>
      (await listOrders(alice, `?search=${encodeURIComponent(search)}`)).body.purchaseOrders.map((o) => o.poNumber);

    assert.deepEqual(await numbers('po-1'), ['PO-100']);
    assert.deepEqual(await numbers('STEEL'), ['PO-200']);
    assert.deepEqual(await numbers('  bharat   steel '), ['PO-200']);
    assert.deepEqual(await numbers('PO'), ['PO-200', 'PO-100']);
    assert.deepEqual(await numbers('nothing like this'), []);
  });

  it('treats search text literally rather than as a pattern', async () => {
    await createOrder(alice, { poNumber: 'PO.1' });
    await createOrder(alice, { poNumber: 'PO-1' });

    const { body: dot } = await listOrders(alice, '?search=O.1');
    const { body: wildcard } = await listOrders(alice, `?search=${encodeURIComponent('.*')}`);

    assert.deepEqual(dot.purchaseOrders.map((order) => order.poNumber), ['PO.1']);
    assert.deepEqual(wildcard.purchaseOrders, []);
  });

  for (const search of ['%00', 'PO%00']) {
    it(`rejects a search containing a NUL byte (${search})`, async () => {
      const { response, body } = await listOrders(alice, `?search=${search}`);

      assert.equal(response.status, 400);
      assert.deepEqual(body.error, {
        message: 'Invalid query parameters.',
        fields: { search: 'Remove the unsupported characters.' },
      });
    });
  }

  it('filters by status', async () => {
    await createOrder(alice, { poNumber: 'PO-1', status: 'draft' });
    await createOrder(alice, { poNumber: 'PO-2', status: 'open' });

    const { body } = await listOrders(alice, '?status=open');

    assert.deepEqual(body.purchaseOrders.map((order) => order.poNumber), ['PO-2']);
    assert.equal(body.pagination.total, 1);
  });

  for (const query of [
    '?page=0',
    '?page=abc',
    '?page=1.5',
    '?page=-1',
    '?page=10001',
    '?limit=0',
    '?limit=101',
    '?status=shipped',
    '?sort=random',
    '?sort=toString',
    `?search=${'x'.repeat(101)}`,
    '?page=1&page=2',
    '?status=draft&status=open',
  ]) {
    it(`rejects ${query.slice(0, 30)}`, async () => {
      const { response, body } = await listOrders(alice, query);

      assert.equal(response.status, 400);
      assert.equal(body.error.message, 'Invalid query parameters.');
      assert.ok(Object.keys(body.error.fields).length > 0);
    });
  }

  it('does not treat bracketed parameters as query operators', async () => {
    await createOrder(alice, { poNumber: 'PO-1', status: 'draft' });
    await createOrder(alice, { poNumber: 'PO-2', status: 'open' });

    const { response, body } = await listOrders(alice, '?status[$ne]=draft&search[$regex]=.*');

    assert.equal(response.status, 200);
    assert.equal(body.pagination.total, 2);
  });

  it('only lists the signed-in user’s records', async () => {
    const bob = await signUp(server.baseUrl, 'Bob');
    await createOrder(alice, { poNumber: 'PO-ALICE' });
    await createOrder(bob, { poNumber: 'PO-BOB' });

    const { body: aliceList } = await listOrders(alice);
    const { body: bobSearch } = await listOrders(bob, '?search=alice');

    assert.deepEqual(aliceList.purchaseOrders.map((order) => order.poNumber), ['PO-ALICE']);
    assert.deepEqual(bobSearch.purchaseOrders, []);
  });
});

describe('GET /api/purchase-orders/:id', () => {
  it('returns the record to its owner', async () => {
    const created = (await (await createOrder(alice)).json()).purchaseOrder;

    const response = await api(`/api/purchase-orders/${created.id}`, { session: alice });

    assert.equal(response.status, 200);
    assert.deepEqual((await response.json()).purchaseOrder, created);
  });

  it('answers another user exactly as if the record did not exist', async () => {
    const bob = await signUp(server.baseUrl, 'Bob');
    const created = (await (await createOrder(alice)).json()).purchaseOrder;

    const othersRecord = await api(`/api/purchase-orders/${created.id}`, { session: bob });
    const missingRecord = await api(`/api/purchase-orders/${'0'.repeat(24)}`, { session: bob });

    assert.equal(othersRecord.status, 404);
    assert.equal(missingRecord.status, 404);
    assert.deepEqual(await othersRecord.json(), await missingRecord.json());
  });

  for (const id of ['abc', 'aaaaaaaaaaaa', `${'0'.repeat(24)}0`, 'zzzzzzzzzzzzzzzzzzzzzzzz', '%24ne']) {
    it(`rejects the malformed id ${id}`, async () => {
      const response = await api(`/api/purchase-orders/${id}`, { session: alice });

      assert.equal(response.status, 400);
      assert.equal((await response.json()).error.message, 'Invalid purchase order id.');
    });
  }

  it('requires a session', async () => {
    assert.equal((await api(`/api/purchase-orders/${'0'.repeat(24)}`)).status, 401);
  });
});

describe('database failures', () => {
  it('return a generic error without internal details', async (t) => {
    t.mock.method(console, 'error', () => {});
    t.mock.method(PurchaseOrder, 'find', () => {
      throw new Error('connect ECONNREFUSED 10.0.0.5:27017 (orders-db.internal)');
    });

    const response = await api('/api/purchase-orders', { session: alice });
    const text = await response.text();

    assert.equal(response.status, 500);
    assert.deepEqual(JSON.parse(text), { error: { message: 'Internal server error' } });
    assert.ok(!text.includes('orders-db.internal'));
  });
});
