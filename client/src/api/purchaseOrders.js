import { apiRequest, withQuery } from './client.js';

export function listPurchaseOrders(params, { signal } = {}) {
  return apiRequest(withQuery('/api/purchase-orders', params), { signal });
}

export function getPurchaseOrder(id, { signal } = {}) {
  return apiRequest(`/api/purchase-orders/${encodeURIComponent(id)}`, { signal });
}

export function createPurchaseOrder(values, csrfToken) {
  return apiRequest('/api/purchase-orders', { method: 'POST', body: values, csrfToken });
}
