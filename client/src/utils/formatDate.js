// Document dates are calendar dates ("YYYY-MM-DD"), so they are formatted in UTC
// to keep the viewer's time zone from moving them to the previous day.
const dateFormatter = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC',
});

const dateTimeFormatter = new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short' });

export function formatDate(value) {
  return value ? dateFormatter.format(new Date(`${value}T00:00:00Z`)) : '—';
}

export function formatDateTime(value) {
  return dateTimeFormatter.format(new Date(value));
}
