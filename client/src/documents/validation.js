// Mirrors the API rules for quick feedback. The API still validates every request.
export const DOCUMENT_NUMBER_MAX_LENGTH = 50;
export const SUPPLIER_NAME_MAX_LENGTH = 200;
export const NOTES_MAX_LENGTH = 2000;

const DOCUMENT_NUMBER_PATTERN = /^[A-Za-z0-9][A-Za-z0-9 ._/#-]*$/;
// Same rules as the API: no text-direction controls, and at least one visible
// character (zero-width joiners inside Indic names are fine).
const BIDI_CONTROLS = /[\u202A-\u202E\u2066-\u2069]/;
const INVISIBLE_ONLY = /^[\p{Cf}\s]*$/u;

function checkDocumentNumber(value, label) {
  const number = value.trim();
  if (!number) return `Enter the ${label}.`;
  if (number.length > DOCUMENT_NUMBER_MAX_LENGTH) return `Use ${DOCUMENT_NUMBER_MAX_LENGTH} characters or fewer.`;
  if (!DOCUMENT_NUMBER_PATTERN.test(number)) {
    return 'Start with a letter or number, and use only letters, numbers, spaces and . _ / # -';
  }
  return null;
}

function checkSupplierName(value) {
  if (!value.trim()) return 'Enter the supplier name.';
  if (BIDI_CONTROLS.test(value)) return 'Remove the text-direction control characters.';
  if (INVISIBLE_ONLY.test(value)) return 'Enter a supplier name with visible characters.';
  return null;
}

function checkCommonFields(values) {
  return {
    supplierName: checkSupplierName(values.supplierName),
    notes: values.notes.length > NOTES_MAX_LENGTH ? `Use ${NOTES_MAX_LENGTH} characters or fewer.` : null,
  };
}

function withoutEmpty(errors) {
  return Object.fromEntries(Object.entries(errors).filter(([, message]) => message));
}

export function validatePurchaseOrderForm(values) {
  return withoutEmpty({
    poNumber: checkDocumentNumber(values.poNumber, 'PO number'),
    issueDate: values.issueDate ? null : 'Enter the issue date.',
    ...checkCommonFields(values),
  });
}

export function validateInvoiceForm(values) {
  // Date inputs give "YYYY-MM-DD", which compares correctly as text.
  const dueBeforeInvoice = values.dueDate && values.invoiceDate && values.dueDate < values.invoiceDate;

  return withoutEmpty({
    invoiceNumber: checkDocumentNumber(values.invoiceNumber, 'invoice number'),
    invoiceDate: values.invoiceDate ? null : 'Enter the invoice date.',
    dueDate: dueBeforeInvoice ? 'The due date cannot be before the invoice date.' : null,
    ...checkCommonFields(values),
  });
}
