export const PURCHASE_ORDER_STATUSES = [
  { value: 'draft', label: 'Draft', tone: 'neutral' },
  { value: 'open', label: 'Open', tone: 'info' },
  { value: 'partially_received', label: 'Partially received', tone: 'warning' },
  { value: 'completed', label: 'Completed', tone: 'success' },
  { value: 'cancelled', label: 'Cancelled', tone: 'muted' },
];

export const INVOICE_STATUSES = [
  { value: 'draft', label: 'Draft', tone: 'neutral' },
  { value: 'pending_review', label: 'Pending review', tone: 'warning' },
  { value: 'matched', label: 'Matched', tone: 'success' },
  { value: 'discrepancy_found', label: 'Discrepancy found', tone: 'danger' },
  { value: 'approved', label: 'Approved', tone: 'success' },
  { value: 'rejected', label: 'Rejected', tone: 'danger' },
];

// Matches the API: the other statuses are outcomes of matching and approval, which
// are not built yet, so a new invoice cannot start with them.
export const NEW_INVOICE_STATUSES = INVOICE_STATUSES.filter(({ value }) => value === 'draft' || value === 'pending_review');

// A short list of common choices. The API accepts any ISO 4217 code.
export const CURRENCIES = ['INR', 'USD', 'EUR', 'GBP', 'AED', 'SGD', 'JPY', 'CNY', 'AUD', 'CAD'];
