import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { verifyOrigin } from '../src/middleware/verifyOrigin.js';

const check = verifyOrigin(['https://app.example.com']);

function run(method, headers = {}) {
  const lowerCased = Object.fromEntries(Object.entries(headers).map(([name, value]) => [name.toLowerCase(), value]));
  const req = { method, get: (name) => lowerCased[name.toLowerCase()] };
  let result;
  check(req, {}, (error) => {
    result = error ?? 'allowed';
  });
  return result === 'allowed' ? 'allowed' : result.status;
}

describe('verifyOrigin', () => {
  it('lets safe methods through regardless of origin', () => {
    assert.equal(run('GET', { 'Sec-Fetch-Site': 'cross-site', Origin: 'https://evil.example' }), 'allowed');
  });

  it('allows same-origin and user-initiated requests', () => {
    assert.equal(run('POST', { 'Sec-Fetch-Site': 'same-origin' }), 'allowed');
    assert.equal(run('POST', { 'Sec-Fetch-Site': 'none' }), 'allowed');
  });

  it('blocks cross-site and same-site requests from untrusted origins', () => {
    assert.equal(run('POST', { 'Sec-Fetch-Site': 'cross-site', Origin: 'https://evil.example' }), 403);
    assert.equal(run('DELETE', { 'Sec-Fetch-Site': 'same-site', Origin: 'https://other.example.com' }), 403);
    assert.equal(run('PUT', { 'Sec-Fetch-Site': 'cross-site' }), 403);
  });

  it('treats unrecognized fetch metadata as cross-site', () => {
    assert.equal(run('POST', { 'Sec-Fetch-Site': 'Same-Origin' }), 403);
    assert.equal(run('POST', { 'Sec-Fetch-Site': 'same-origin, cross-site' }), 403);
    assert.equal(run('POST', { 'Sec-Fetch-Site': '', Origin: 'https://evil.example' }), 403);
  });

  it('falls back to the Origin header for older browsers', () => {
    assert.equal(run('POST', { Origin: 'https://evil.example' }), 403);
    assert.equal(run('POST', { Origin: 'null' }), 403);
    assert.equal(run('POST', { Origin: 'https://app.example.com' }), 'allowed');
  });

  it('allows trusted origins even when cross-site', () => {
    assert.equal(run('PATCH', { 'Sec-Fetch-Site': 'cross-site', Origin: 'https://app.example.com' }), 'allowed');
  });

  it('allows non-browser clients that send neither header', () => {
    assert.equal(run('POST'), 'allowed');
  });
});
