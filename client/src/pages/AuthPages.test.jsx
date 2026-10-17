import { fireEvent, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { errorResponse, healthyBody, jsonResponse, mockFetch, renderApp, signedInBody } from '../test/helpers.jsx';

const signedOut = () => errorResponse(401, 'Sign in to continue.');
const healthy = () => jsonResponse(healthyBody);

function fillIn(label, value) {
  fireEvent.change(screen.getByLabelText(label), { target: { value } });
}

function requestBody(fetchMock, url) {
  const [, options] = fetchMock.mock.calls.find(([calledUrl]) => calledUrl === url);
  return JSON.parse(options.body);
}

describe('LoginPage', () => {
  it('checks required fields before contacting the server', async () => {
    const fetchMock = mockFetch({ 'GET /api/auth/me': signedOut });
    renderApp('/login');

    fireEvent.click(await screen.findByRole('button', { name: 'Sign in' }));

    expect(screen.getByText('Enter your email address.')).toBeInTheDocument();
    expect(screen.getByText('Enter your password.')).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toHaveAttribute('aria-invalid', 'true');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('signs in and shows the dashboard', async () => {
    const fetchMock = mockFetch({
      'GET /api/auth/me': signedOut,
      'POST /api/auth/login': () => jsonResponse(signedInBody),
      'GET /api/health': healthy,
    });
    renderApp('/');

    await screen.findByRole('heading', { name: 'Sign in' });
    fillIn('Email', 'asha@example.com');
    fillIn('Password', 'correct horse battery');
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(await screen.findByText('Asha Verma')).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Reconciliation workflow' })).toBeInTheDocument();
    expect(requestBody(fetchMock, '/api/auth/login')).toEqual({
      email: 'asha@example.com',
      password: 'correct horse battery',
    });
  });

  it('shows the server’s generic error and lets the user try again', async () => {
    mockFetch({
      'GET /api/auth/me': signedOut,
      'POST /api/auth/login': () => errorResponse(401, 'Incorrect email or password.'),
    });
    renderApp('/login');

    await screen.findByRole('heading', { name: 'Sign in' });
    fillIn('Email', 'asha@example.com');
    fillIn('Password', 'wrong password');
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Incorrect email or password.');
    expect(screen.getByRole('button', { name: 'Sign in' })).toBeEnabled();
    expect(screen.getByLabelText('Email')).toHaveValue('asha@example.com');
  });

  it('explains rate limiting', async () => {
    mockFetch({
      'GET /api/auth/me': signedOut,
      'POST /api/auth/login': () => errorResponse(429, 'Too many failed sign-in attempts. Try again in 15 minutes.'),
    });
    renderApp('/login');

    await screen.findByRole('heading', { name: 'Sign in' });
    fillIn('Email', 'asha@example.com');
    fillIn('Password', 'anything at all');
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Too many failed sign-in attempts');
  });

  it('sends a signed-in user straight to the dashboard', async () => {
    mockFetch({ 'GET /api/auth/me': () => jsonResponse(signedInBody), 'GET /api/health': healthy });

    renderApp('/login');

    expect(await screen.findByText('Asha Verma')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Sign in' })).not.toBeInTheDocument();
  });
});

describe('RegisterPage', () => {
  it('validates fields before contacting the server', async () => {
    const fetchMock = mockFetch({ 'GET /api/auth/me': signedOut });
    renderApp('/register');

    await screen.findByRole('heading', { name: 'Create your account' });
    fillIn('Email', 'not-an-email');
    fillIn('Password', 'too short');
    fireEvent.click(screen.getByRole('button', { name: 'Create account' }));

    expect(screen.getByText('Enter your name.')).toBeInTheDocument();
    expect(screen.getByText('Enter a valid email address.')).toBeInTheDocument();
    expect(screen.getByText('Password must be at least 12 characters.')).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('shows field errors returned by the server', async () => {
    mockFetch({
      'GET /api/auth/me': signedOut,
      'POST /api/auth/register': () =>
        errorResponse(409, 'An account with this email already exists.', {
          email: 'An account with this email already exists.',
        }),
    });
    renderApp('/register');

    await screen.findByRole('heading', { name: 'Create your account' });
    fillIn('Name', 'Asha Verma');
    fillIn('Email', 'asha@example.com');
    fillIn('Password', 'correct horse battery');
    fireEvent.click(screen.getByRole('button', { name: 'Create account' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('An account with this email already exists.');
    expect(screen.getByLabelText('Email')).toHaveAttribute('aria-invalid', 'true');
  });

  it('creates the account and signs the user in', async () => {
    const fetchMock = mockFetch({
      'GET /api/auth/me': signedOut,
      'POST /api/auth/register': () => jsonResponse(signedInBody, 201),
      'GET /api/health': healthy,
    });
    renderApp('/register');

    await screen.findByRole('heading', { name: 'Create your account' });
    fillIn('Name', 'Asha Verma');
    fillIn('Email', 'asha@example.com');
    fillIn('Password', 'correct horse battery');
    fireEvent.click(screen.getByRole('button', { name: 'Create account' }));

    expect(await screen.findByText('Asha Verma')).toBeInTheDocument();
    expect(requestBody(fetchMock, '/api/auth/register')).toEqual({
      name: 'Asha Verma',
      email: 'asha@example.com',
      password: 'correct horse battery',
    });
  });

  it('links between sign-in and registration', async () => {
    mockFetch({ 'GET /api/auth/me': signedOut });
    renderApp('/login');

    fireEvent.click(await screen.findByRole('link', { name: 'Create an account' }));
    expect(await screen.findByRole('heading', { name: 'Create your account' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('link', { name: 'Sign in' }));
    expect(await screen.findByRole('heading', { name: 'Sign in' })).toBeInTheDocument();
  });
});
