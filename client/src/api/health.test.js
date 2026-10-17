import { describe, expect, it, vi } from 'vitest';
import { healthyBody, jsonResponse } from '../test/helpers.jsx';
import { fetchHealth } from './health.js';

describe('fetchHealth', () => {
  it('returns the health payload from the API', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(healthyBody));
    vi.stubGlobal('fetch', fetchMock);

    await expect(fetchHealth()).resolves.toEqual(healthyBody);
    expect(fetchMock).toHaveBeenCalledWith('/api/health', expect.objectContaining({ signal: expect.anything() }));
  });

  it('rejects when the API responds with an error status', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({ error: {} }, 503)));

    await expect(fetchHealth()).rejects.toThrow('Health check failed with HTTP 503.');
  });

  it('rejects a response that is not a health payload', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('<!doctype html>', { status: 200 })));

    await expect(fetchHealth()).rejects.toThrow('The API returned an unexpected health response.');
  });

  it('explains network failures', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));

    await expect(fetchHealth()).rejects.toThrow('Could not reach the API.');
  });
});
