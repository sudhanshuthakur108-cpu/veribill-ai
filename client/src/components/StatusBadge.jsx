export default function StatusBadge({ statuses, value }) {
  const status = statuses.find((option) => option.value === value);

  return <span className={`status-tag tone-${status?.tone ?? 'neutral'}`}>{status?.label ?? value}</span>;
}
