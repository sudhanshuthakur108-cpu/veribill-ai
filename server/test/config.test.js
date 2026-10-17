import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { loadConfig } from '../src/config.js';

describe('loadConfig', () => {
  it('falls back to development defaults when variables are unset', () => {
    assert.deepEqual(loadConfig({}), {
      port: 4000,
      nodeEnv: 'development',
      isProduction: false,
      mongodbUri: 'mongodb://127.0.0.1:27017/veribill',
      sessionTtlMs: 8 * 60 * 60 * 1000,
      trustedOrigins: [],
    });
  });

  it('reads every variable', () => {
    const config = loadConfig({
      PORT: '8080',
      NODE_ENV: 'production',
      MONGODB_URI: 'mongodb+srv://cluster.example.net/veribill',
      SESSION_TTL_HOURS: '1.5',
      TRUSTED_ORIGINS: 'https://app.example.com, http://localhost:5173',
    });

    assert.deepEqual(config, {
      port: 8080,
      nodeEnv: 'production',
      isProduction: true,
      mongodbUri: 'mongodb+srv://cluster.example.net/veribill',
      sessionTtlMs: 1.5 * 60 * 60 * 1000,
      trustedOrigins: ['https://app.example.com', 'http://localhost:5173'],
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

  it('requires MONGODB_URI in production', () => {
    assert.throws(() => loadConfig({ NODE_ENV: 'production' }), /MONGODB_URI is required/);
  });

  it('rejects a MONGODB_URI that is not a MongoDB connection string', () => {
    assert.throws(() => loadConfig({ MONGODB_URI: 'postgres://localhost/veribill' }), /Invalid MONGODB_URI/);
  });

  for (const value of ['0', '-2', 'soon', '721']) {
    it(`rejects SESSION_TTL_HOURS=${value}`, () => {
      assert.throws(() => loadConfig({ SESSION_TTL_HOURS: value }), /Invalid SESSION_TTL_HOURS/);
    });
  }

  for (const value of ['localhost:5173', 'https://app.example.com/', 'https://app.example.com/path']) {
    it(`rejects TRUSTED_ORIGINS entry ${value}`, () => {
      assert.throws(() => loadConfig({ TRUSTED_ORIGINS: value }), /Invalid TRUSTED_ORIGINS/);
    });
  }
});
