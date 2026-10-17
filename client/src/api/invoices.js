import { apiRequest, withQuery } from './client.js';

export function listInvoices(params, { signal } = {}) {
  return apiRequest(withQuery('/api/invoices', params), { signal });
}

export function getInvoice(id, { signal } = {}) {
  return apiRequest(`/api/invoices/${encodeURIComponent(id)}`, { signal });
}

export function createInvoice(values, csrfToken) {
  return apiRequest('/api/invoices', { method: 'POST', body: values, csrfToken });
}
