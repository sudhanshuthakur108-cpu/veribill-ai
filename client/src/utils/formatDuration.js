const UNITS = [
  ['d', 86400],
  ['h', 3600],
  ['m', 60],
  ['s', 1],
];

// Shows the two most significant units, e.g. "3h 12m" or "45s".
export function formatDuration(totalSeconds) {
  let remaining = Math.max(0, Math.floor(totalSeconds));
  const parts = [];

  for (const [label, size] of UNITS) {
    const value = Math.floor(remaining / size);
    remaining -= value * size;
    if (value > 0 || parts.length > 0) {
      parts.push(`${value}${label}`);
    }
    if (parts.length === 2) break;
  }

  return parts.length > 0 ? parts.join(' ') : '0s';
}
