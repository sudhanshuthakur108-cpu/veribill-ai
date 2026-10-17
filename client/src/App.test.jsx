import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import App from './App.jsx';
import { healthyBody, jsonResponse } from './test/responses.js';

describe('App', () => {
  it('shows the backend as connected when the health check succeeds', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(healthyBody)));

    render(<App />);

    expect(await screen.findByText('API online')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Connected');
    expect(screen.getByText('veribill-api')).toBeInTheDocument();
    expect(screen.getByText('1h 2m')).toBeInTheDocument();
  });

  it('shows the backend as unavailable with the reason', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({}, 503)));

    render(<App />);

    expect(await screen.findByText('API offline')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Unavailable');
    expect(screen.getByText('Health check failed with HTTP 503.')).toBeInTheDocument();
  });

  it('recovers when the user checks again after a failure', async () => {
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockResolvedValueOnce(jsonResponse(healthyBody));
    vi.stubGlobal('fetch', fetchMock);

    render(<App />);
    expect(await screen.findByText('API offline')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Check again' }));

    expect(await screen.findByText('API online')).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('shows a pending check and disables re-checking until it settles', () => {
    vi.stubGlobal('fetch', vi.fn(() => new Promise(() => {})));

    render(<App />);

    expect(screen.getByText('Checking API')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Check again' })).toBeDisabled();
  });

  it('labels the reconciliation workflow as planned rather than available', () => {
    vi.stubGlobal('fetch', vi.fn(() => new Promise(() => {})));

    render(<App />);

    const workflow = screen.getByRole('region', { name: 'Reconciliation workflow' });
    expect(workflow).toHaveTextContent('Planned');
    expect(workflow).toHaveTextContent('not available in this build');
  });
});
