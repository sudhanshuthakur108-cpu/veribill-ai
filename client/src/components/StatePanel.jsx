// Loading, empty and error messages share one layout. Errors use role="alert" so
// screen readers announce them; everything else is a polite status update.
export default function StatePanel({ title, detail, action, role = 'status' }) {
  return (
    <div className="state-panel" role={role}>
      <p className="state-panel-title">{title}</p>
      {detail && <p className="state-panel-detail">{detail}</p>}
      {action}
    </div>
  );
}
