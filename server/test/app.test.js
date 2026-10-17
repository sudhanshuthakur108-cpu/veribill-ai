import assert from 'node:assert/strict';
import { once } from 'node:events';
import { after, before, describe, it } from 'node:test';
import packageJson from '../package.json' with { type: 'json' };
import { createApp } from '../src/app.js';

let server;
let baseUrl;

before(async () => {
  server = createApp().listen(0, '127.0.0.1');
  await once(server, 'listening');
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(() => {
  server.close();
});

describe('GET /api/health', () => {
  it('reports the service as healthy', async () => {
    const response = await fetch(`${baseUrl}/api/health`);
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.match(response.headers.get('content-type'), /application\/json/);
    assert.equal(body.status, 'ok');
    assert.equal(body.service, 'veribill-api');
    assert.equal(body.version, packageJson.version);
    assert.ok(Number.isInteger(body.uptimeSeconds) && body.uptimeSeconds >= 0);
    assert.ok(!Number.isNaN(Date.parse(body.timestamp)));
  });

  it('is never cached', async () => {
    const response = await fetch(`${baseUrl}/api/health`);

    assert.equal(response.headers.get('cache-control'), 'no-store');
  });

  it('does not advertise the framework', async () => {
    const response = await fetch(`${baseUrl}/api/health`);

    assert.equal(response.headers.get('x-powered-by'), null);
  });
});

describe('unknown routes', () => {
  it('respond with a JSON 404', async () => {
    const response = await fetch(`${baseUrl}/api/invoices`);
    const body = await response.json();

    assert.equal(response.status, 404);
    assert.equal(body.error.message, 'Route not found: GET /api/invoices');
  });
});
