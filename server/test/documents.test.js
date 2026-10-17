import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { parseDateOnly, toDateOnly } from '../src/documents/dates.js';
import { cleanText, escapeRegExp, lookupKey } from '../src/documents/normalize.js';

describe('parseDateOnly', () => {
  it('parses calendar dates as UTC midnight', () => {
    assert.equal(parseDateOnly('2026-10-17').toISOString(), '2026-10-17T00:00:00.000Z');
    assert.equal(toDateOnly(parseDateOnly('2028-02-29')), '2028-02-29');
  });

  it('rejects impossible, partial and out-of-range dates', () => {
    for (const value of ['2026-02-29', '2026-13-01', '2026-04-31', '2026-1-1', '2026-10-17T00:00', '1899-12-31', '2101-01-01', '']) {
      assert.equal(parseDateOnly(value), null, value);
    }
  });
});

describe('lookupKey', () => {
  it('ignores case, surrounding space and repeated spaces', () => {
    assert.equal(lookupKey('  Acme   Industrial\tSupplies '), 'acme industrial supplies');
    assert.equal(lookupKey('PO-2026-001'), lookupKey(' po-2026-001'));
  });

  it('keeps punctuation and suffixes that can distinguish suppliers or documents', () => {
    assert.notEqual(lookupKey('ABC Traders'), lookupKey('ABC Traders Pvt Ltd'));
    assert.notEqual(lookupKey('PO-1'), lookupKey('PO1'));
  });

  it('folds compatibility characters such as full-width digits', () => {
    assert.equal(cleanText('ＰＯ－１'), 'PO-1');
  });
});

describe('escapeRegExp', () => {
  it('makes every pattern character literal', () => {
    const special = '.*+?^${}()|[]\\';
    assert.ok(new RegExp(escapeRegExp(special)).test(`x${special}x`));
    assert.ok(!new RegExp(escapeRegExp('a.c')).test('abc'));
  });
});
