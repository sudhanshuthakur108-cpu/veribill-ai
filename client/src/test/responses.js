export const healthyBody = {
  status: 'ok',
  service: 'veribill-api',
  version: '0.1.0',
  uptimeSeconds: 3725,
  timestamp: '2026-01-15T09:30:00.000Z',
};

export function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
