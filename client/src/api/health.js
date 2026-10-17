const HEALTH_TIMEOUT_MS = 5000;

export async function fetchHealth({ signal } = {}) {
  const timeoutSignal = AbortSignal.timeout(HEALTH_TIMEOUT_MS);

  let response;
  try {
    response = await fetch('/api/health', {
      headers: { Accept: 'application/json' },
      signal: signal ? AbortSignal.any([signal, timeoutSignal]) : timeoutSignal,
    });
  } catch (error) {
    if (error.name === 'AbortError') {
      throw error;
    }
    if (error.name === 'TimeoutError') {
      throw new Error(`The API did not respond within ${HEALTH_TIMEOUT_MS / 1000} seconds.`, { cause: error });
    }
    throw new Error('Could not reach the API.', { cause: error });
  }

  if (!response.ok) {
    throw new Error(`Health check failed with HTTP ${response.status}.`);
  }

  const body = await response.json().catch(() => null);
  if (body?.status !== 'ok') {
    throw new Error('The API returned an unexpected health response.');
  }
  return body;
}
