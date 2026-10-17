import { fireEvent, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { errorResponse, healthyBody, jsonResponse, mockFetch, renderApp, signedInBody } from './test/helpers.jsx';

const signedIn = () => jsonResponse(signedInBody);
const signedOut = () => errorResponse(401, 'Sign in to continue.');
const healthy = () => jsonResponse(healthyBody);

describe('App', () => {
  it('sends visitors without a session to the sign-in page', async () => {
    mockFetch({ 'GET /api/auth/me': signedOut });

    renderApp('/');

    expect(await screen.findByRole('heading', { name: 'Sign in' })).toBeInTheDocument();
    expect(screen.queryByText('Reconciliation workflow')).not.toBeInTheDocument();
  });

  it('shows the dashboard and backend status to a signed-in user', async () => {
    mockFetch({ 'GET /api/auth/me': signedIn, 'GET /api/health': healthy });

    renderApp('/');

    expect(await screen.findByText('API online')).toBeInTheDocument();
    expect(screen.getByText('Asha Verma')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Connected');
    expect(screen.getByText('veribill-api')).toBeInTheDocument();
    expect(screen.getByText('1h 2m')).toBeInTheDocument();
  });

  it('shows the backend as unavailable with the reason', async () => {
    mockFetch({ 'GET /api/auth/me': signedIn, 'GET /api/health': () => jsonResponse({}, 503) });

    renderApp('/');

    expect(await screen.findByText('API offline')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Unavailable');
    expect(screen.getByText('Health check failed with HTTP 503.')).toBeInTheDocument();
  });

  it('recovers when the user checks the backend again', async () => {
    let healthChecks = 0;
    mockFetch({
      'GET /api/auth/me': signedIn,
      'GET /api/health': () => {
        healthChecks += 1;
        return healthChecks === 1 ? jsonResponse({}, 503) : jsonResponse(healthyBody);
      },
    });

    renderApp('/');
    expect(await screen.findByText('API offline')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Check again' }));

    expect(await screen.findByText('API online')).toBeInTheDocument();
    expect(healthChecks).toBe(2);
  });

  it('labels the reconciliation workflow as planned rather than available', async () => {
    mockFetch({ 'GET /api/auth/me': signedIn, 'GET /api/health': healthy });

    renderApp('/');

    const workflow = await screen.findByRole('region', { name: 'Reconciliation workflow' });
    expect(workflow).toHaveTextContent('Planned');
    expect(workflow).toHaveTextContent('not available in this build');
  });

  it('shows a pending state while the session is being checked', () => {
    mockFetch({ 'GET /api/auth/me': () => new Promise(() => {}) });

    renderApp('/');

    expect(screen.getByRole('status')).toHaveTextContent('Checking your session…');
  });

  it('offers a retry when the session check fails, instead of signing the user out', async () => {
    let attempts = 0;
    mockFetch({
      'GET /api/auth/me': () => {
        attempts += 1;
        return attempts === 1 ? Promise.reject(new TypeError('Failed to fetch')) : signedIn();
      },
      'GET /api/health': healthy,
    });

    renderApp('/');
    expect(await screen.findByText('We couldn’t check whether you’re signed in.')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));

    expect(await screen.findByText('Asha Verma')).toBeInTheDocument();
  });

  it('signs out with the CSRF token and returns to the sign-in page', async () => {
    const fetchMock = mockFetch({
      'GET /api/auth/me': signedIn,
      'GET /api/health': healthy,
      'POST /api/auth/logout': () => new Response(null, { status: 204 }),
    });

    renderApp('/');
    fireEvent.click(await screen.findByRole('button', { name: 'Sign out' }));

    expect(await screen.findByRole('heading', { name: 'Sign in' })).toBeInTheDocument();
    const [, logoutOptions] = fetchMock.mock.calls.find(([url]) => url === '/api/auth/logout');
    expect(logoutOptions.headers['X-CSRF-Token']).toBe('test-csrf-token');
  });

  it('keeps the user signed in and explains when sign-out fails', async () => {
    mockFetch({
      'GET /api/auth/me': signedIn,
      'GET /api/health': healthy,
      'POST /api/auth/logout': () => errorResponse(403, 'Invalid or missing CSRF token.'),
    });

    renderApp('/');
    fireEvent.click(await screen.findByRole('button', { name: 'Sign out' }));

    const alert = await screen.findByRole('alert');
    expect(within(alert).getByText(/Invalid or missing CSRF token/)).toBeInTheDocument();
    expect(screen.getByText('Asha Verma')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sign out' })).toBeEnabled();
  });

  it('redirects unknown paths to the dashboard', async () => {
    mockFetch({ 'GET /api/auth/me': signedIn, 'GET /api/health': healthy });

    renderApp('/does-not-exist');

    expect(await screen.findByText('Asha Verma')).toBeInTheDocument();
  });
});
