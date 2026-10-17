import { formatDuration } from '../utils/formatDuration.js';

const STATUS_LABELS = {
  checking: 'Checking connection…',
  online: 'Connected',
  offline: 'Unavailable',
};

export default function SystemStatusPanel({ status, health, error, checkedAt, recheck }) {
  return (
    <section className="card" aria-labelledby="system-status-title">
      <div className="card-header">
        <h2 id="system-status-title">Backend connection</h2>
        <button type="button" className="button" onClick={recheck} disabled={status === 'checking'}>
          Check again
        </button>
      </div>

      <p className={`status-line status-${status}`} role="status">
        <span className="status-dot" aria-hidden="true" />
        {STATUS_LABELS[status]}
      </p>

      {status === 'online' && (
        <dl className="detail-list">
          <div>
            <dt>Service</dt>
            <dd>{health.service}</dd>
          </div>
          <div>
            <dt>Version</dt>
            <dd>{health.version}</dd>
          </div>
          <div>
            <dt>Uptime</dt>
            <dd>{formatDuration(health.uptimeSeconds)}</dd>
          </div>
          <div>
            <dt>Last checked</dt>
            <dd>
              <time dateTime={checkedAt.toISOString()}>{checkedAt.toLocaleTimeString()}</time>
            </dd>
          </div>
        </dl>
      )}

      {status === 'offline' && (
        <div className="status-error">
          <p>{error}</p>
          <p className="hint">
            Start the API with <code>npm run dev</code> from the project root, then check again.
          </p>
        </div>
      )}
    </section>
  );
}
