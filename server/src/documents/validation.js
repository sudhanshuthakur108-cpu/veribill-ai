import { HttpError } from '../httpError.js';
import { NEW_INVOICE_STATUSES } from '../models/Invoice.js';
import { PURCHASE_ORDER_STATUSES } from '../models/PurchaseOrder.js';
import { parseDateOnly } from './dates.js';
import { cleanText } from './normalize.js';

export const DOCUMENT_NUMBER_MAX_LENGTH = 50;
export const SUPPLIER_NAME_MAX_LENGTH = 200;
export const NOTES_MAX_LENGTH = 2000;
export const DEFAULT_CURRENCY = 'INR';

const DOCUMENT_NUMBER_PATTERN = /^[A-Za-z0-9][A-Za-z0-9 ._/#-]*$/;
const CONTROL_CHARACTERS = /\p{Cc}/u;
// Embedding, override and isolate controls make text display in a different order
// from how it is stored, which could disguise one supplier as another.
const BIDI_CONTROLS = /[\u202A-\u202E\u2066-\u2069]/;
// Format characters such as zero-width spaces and soft hyphens are invisible. They are
// fine inside a name (ZWJ and ZWNJ shape many Indic scripts) but not on their own.
const INVISIBLE_ONLY = /^[\p{Cf}\s]*$/u;
// Notes may span lines, so line breaks and tabs are the only control characters allowed.
const NOTES_CONTROL_CHARACTERS = /(?![\n\r\t])\p{Cc}/u;
const CURRENCIES = new Set(Intl.supportedValuesOf('currency'));

function isBlank(value) {
  return value === undefined || value === null || (typeof value === 'string' && value.trim() === '');
}

// Values of the wrong type (including objects such as { "$ne": null }) are rejected
// outright, so request bodies can never smuggle query operators into the database.
function requiredText(body, field, missingMessage, fields) {
  const value = body?.[field];
  if (isBlank(value)) {
    fields[field] = missingMessage;
    return undefined;
  }
  if (typeof value !== 'string') {
    fields[field] = 'Must be text.';
    return undefined;
  }
  return cleanText(value);
}

function documentNumber(body, field, label, fields) {
  const value = requiredText(body, field, `Enter the ${label}.`, fields);
  if (value === undefined) return undefined;

  if (value.length > DOCUMENT_NUMBER_MAX_LENGTH) {
    fields[field] = `Use ${DOCUMENT_NUMBER_MAX_LENGTH} characters or fewer.`;
  } else if (!DOCUMENT_NUMBER_PATTERN.test(value)) {
    fields[field] = 'Start with a letter or number, and use only letters, numbers, spaces and . _ / # -';
  }
  return value;
}

function supplierName(body, fields) {
  const value = requiredText(body, 'supplierName', 'Enter the supplier name.', fields);
  if (value === undefined) return undefined;

  if (value.length > SUPPLIER_NAME_MAX_LENGTH) {
    fields.supplierName = `Use ${SUPPLIER_NAME_MAX_LENGTH} characters or fewer.`;
  } else if (CONTROL_CHARACTERS.test(value)) {
    fields.supplierName = 'Remove the unsupported characters.';
  } else if (BIDI_CONTROLS.test(value)) {
    fields.supplierName = 'Remove the text-direction control characters.';
  } else if (INVISIBLE_ONLY.test(value)) {
    fields.supplierName = 'Enter a supplier name with visible characters.';
  }
  return value;
}

function date(body, field, label, { required }, fields) {
  const value = body?.[field];
  if (isBlank(value)) {
    if (required) fields[field] = `Enter the ${label}.`;
    return undefined;
  }

  const parsed = typeof value === 'string' ? parseDateOnly(value.trim()) : null;
  if (!parsed) {
    fields[field] = `Enter a valid ${label} (YYYY-MM-DD).`;
    return undefined;
  }
  return parsed;
}

function currency(body, fields) {
  const value = body?.currency;
  if (isBlank(value)) return DEFAULT_CURRENCY;

  const code = typeof value === 'string' ? value.trim().toUpperCase() : '';
  if (!CURRENCIES.has(code)) {
    fields.currency = 'Use a three-letter ISO 4217 currency code, such as INR.';
    return undefined;
  }
  return code;
}

function status(body, allowed, invalidMessage, fields) {
  const value = body?.status;
  if (isBlank(value)) return 'draft';

  if (typeof value !== 'string' || !allowed.includes(value)) {
    fields.status = invalidMessage;
    return undefined;
  }
  return value;
}

function notes(body, fields) {
  const value = body?.notes;
  if (isBlank(value)) return undefined;
  if (typeof value !== 'string') {
    fields.notes = 'Must be text.';
    return undefined;
  }

  const text = value.trim();
  if (text.length > NOTES_MAX_LENGTH) {
    fields.notes = `Use ${NOTES_MAX_LENGTH} characters or fewer.`;
  } else if (NOTES_CONTROL_CHARACTERS.test(text)) {
    fields.notes = 'Remove the unsupported characters.';
  }
  return text;
}

function throwIfInvalid(fields) {
  if (Object.keys(fields).length > 0) {
    throw new HttpError(400, 'Please correct the highlighted fields.', fields);
  }
}

// Only the fields listed here are read from the request body, so a client can never
// set createdBy, timestamps or lookup keys itself.
export function validatePurchaseOrder(body) {
  const fields = {};
  const values = {
    poNumber: documentNumber(body, 'poNumber', 'PO number', fields),
    supplierName: supplierName(body, fields),
    issueDate: date(body, 'issueDate', 'issue date', { required: true }, fields),
    currency: currency(body, fields),
    status: status(body, PURCHASE_ORDER_STATUSES, 'Choose a valid status.', fields),
    notes: notes(body, fields),
  };
  throwIfInvalid(fields);
  return values;
}

export function validateInvoice(body) {
  const fields = {};
  const values = {
    invoiceNumber: documentNumber(body, 'invoiceNumber', 'invoice number', fields),
    supplierName: supplierName(body, fields),
    invoiceDate: date(body, 'invoiceDate', 'invoice date', { required: true }, fields),
    dueDate: date(body, 'dueDate', 'due date', { required: false }, fields),
    currency: currency(body, fields),
    status: status(body, NEW_INVOICE_STATUSES, 'New invoices can only be draft or pending review.', fields),
    notes: notes(body, fields),
  };

  if (values.invoiceDate && values.dueDate && values.dueDate < values.invoiceDate) {
    fields.dueDate = 'The due date cannot be before the invoice date.';
  }
  throwIfInvalid(fields);
  return values;
}
