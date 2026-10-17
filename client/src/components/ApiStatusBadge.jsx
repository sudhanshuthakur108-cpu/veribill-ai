const LABELS = {
  checking: 'Checking API',
  online: 'API online',
  offline: 'API offline',
};

export default function ApiStatusBadge({ status }) {
  return (
    <span className={`status-badge status-${status}`}>
      <span className="status-dot" aria-hidden="true" />
      {LABELS[status]}
    </span>
  );
}
