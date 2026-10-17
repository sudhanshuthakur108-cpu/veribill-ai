import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { loadConfig } from '../src/config.js';

describe('loadConfig', () => {
  it('falls back to defaults when variables are unset', () => {
    assert.deepEqual(loadConfig({}), { port: 4000, nodeEnv: 'development' });
  });

  it('reads PORT and NODE_ENV', () => {
    assert.deepEqual(loadConfig({ PORT: '8080', NODE_ENV: 'production' }), {
      port: 8080,
      nodeEnv: 'production',
    });
  });

  it('treats an empty PORT as unset', () => {
    assert.equal(loadConfig({ PORT: '' }).port, 4000);
  });

  for (const value of ['abc', '80.5', '-1', '70000']) {
    it(`rejects PORT=${value}`, () => {
      assert.throws(() => loadConfig({ PORT: value }), /Invalid PORT/);
    });
  }
});
