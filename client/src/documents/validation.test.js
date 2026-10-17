import { describe, expect, it } from 'vitest';
import { validatePurchaseOrderForm } from './validation.js';

const validOrder = { poNumber: 'PO-1', supplierName: 'Acme', issueDate: '2026-10-01', notes: '' };

function supplierError(supplierName) {
  return validatePurchaseOrderForm({ ...validOrder, supplierName }).supplierName;
}

describe('supplier name checks', () => {
  it('rejects names made only of invisible characters', () => {
    expect(supplierError('\u200B')).toBe('Enter a supplier name with visible characters.');
    expect(supplierError('\u00AD \u200C')).toBe('Enter a supplier name with visible characters.');
  });

  it('rejects text-direction control characters', () => {
    expect(supplierError('\u202EsrepuS emcA')).toBe('Remove the text-direction control characters.');
    expect(supplierError('Acme \u2066Ltd\u2069')).toBe('Remove the text-direction control characters.');
  });

  it('accepts Indic-script names that use ZWJ or ZWNJ', () => {
    expect(supplierError('क्\u200Dष ट्रेडर्स')).toBeUndefined();
    expect(supplierError('ശ്രീ\u200Cകൃഷ്ണ എന്റർപ്രൈസസ്')).toBeUndefined();
  });
});
