import { describe, expect, it, vi } from 'vitest';
import { errorResponse, jsonResponse } from '../test/helpers.jsx';
import { ApiError, apiRequest } from './client.js';

describe('apiRequest', () => {
  it('sends JSON bodies and the CSRF token header', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ ok: true }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(apiRequest('/api/things', { method: 'POST', body: { a: 1 }, csrfToken: 'token' })).resolves.toEqual({
      ok: true,
    });

    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe('/api/things');
    expect(options.method).toBe('POST');
    expect(options.body).toBe('{"a":1}');
    expect(options.headers).toMatchObject({ 'Content-Type': 'application/json', 'X-CSRF-Token': 'token' });
  });

  it('omits body headers on plain GET requests', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({}));
    vi.stubGlobal('fetch', fetchMock);

    await apiRequest('/api/things');

    const [, options] = fetchMock.mock.calls[0];
    expect(options.body).toBeUndefined();
    expect(options.headers).not.toHaveProperty('Content-Type');
    expect(options.headers).not.toHaveProperty('X-CSRF-Token');
  });

  it('returns null for 204 responses', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 204 })));

    await expect(apiRequest('/api/things', { method: 'POST' })).resolves.toBeNull();
  });

  it('turns error responses into ApiError with status and field errors', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(errorResponse(400, 'Fix it.', { email: 'Bad email.' })));

    const error = await apiRequest('/api/things').catch((caught) => caught);

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ status: 400, message: 'Fix it.', fields: { email: 'Bad email.' } });
  });

  it('falls back to a generic message when the error body is not JSON', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('Bad Gateway', { status: 502 })));

    await expect(apiRequest('/api/things')).rejects.toMatchObject({
      status: 502,
      message: 'Request failed with HTTP 502.',
    });
  });

  it('reports network failures without exposing low-level errors', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));

    await expect(apiRequest('/api/things')).rejects.toMatchObject({
      status: 0,
      message: 'Could not reach the server. Check that the API is running and try again.',
    });
  });
});
