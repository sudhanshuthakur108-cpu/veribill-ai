const DATE_ONLY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const MIN_YEAR = 1900;
const MAX_YEAR = 2100;

// Document dates are calendar dates without a time of day. They are stored as UTC
// midnight and always sent as "YYYY-MM-DD", so no time zone can shift them.
export function parseDateOnly(value) {
  const match = DATE_ONLY_PATTERN.exec(value);
  if (!match) {
    return null;
  }

  const [year, month, day] = match.slice(1).map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  const isRealDate = date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;

  return isRealDate && year >= MIN_YEAR && year <= MAX_YEAR ? date : null;
}

export function toDateOnly(date) {
  return date ? date.toISOString().slice(0, 10) : null;
}
