import { apiRequest } from './client.js';

export function getSession({ signal } = {}) {
  return apiRequest('/api/auth/me', { signal });
}

export function login(credentials) {
  return apiRequest('/api/auth/login', { method: 'POST', body: credentials });
}

export function register(details) {
  return apiRequest('/api/auth/register', { method: 'POST', body: details });
}

export function logout(csrfToken) {
  return apiRequest('/api/auth/logout', { method: 'POST', csrfToken });
}
