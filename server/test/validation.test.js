import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { normalizeEmail, validateLogin, validateRegistration } from '../src/auth/validation.js';

function fieldErrors(fn) {
  try {
    fn();
  } catch (error) {
    assert.equal(error.status, 400);
    return error.fields;
  }
  assert.fail('expected a validation error');
}

describe('normalizeEmail', () => {
  it('trims and lowercases', () => {
    assert.equal(normalizeEmail('  Asha.Verma@Example.COM '), 'asha.verma@example.com');
  });
});

describe('validateRegistration', () => {
  const valid = { name: ' Asha Verma ', email: 'Asha@Example.com', password: 'twelve chars' };

  it('returns cleaned values', () => {
    assert.deepEqual(validateRegistration(valid), {
      name: 'Asha Verma',
      email: 'asha@example.com',
      password: 'twelve chars',
    });
  });

  it('keeps whitespace and case in passwords', () => {
    assert.equal(validateRegistration({ ...valid, password: '  Spaced Out  ' }).password, '  Spaced Out  ');
  });

  it('normalizes passwords to NFKC', () => {
    assert.equal(validateRegistration({ ...valid, password: 'café au lait please' }).password, 'café au lait please');
  });

  it('enforces password length limits', () => {
    assert.ok(fieldErrors(() => validateRegistration({ ...valid, password: 'eleven char' })).password);
    assert.ok(fieldErrors(() => validateRegistration({ ...valid, password: 'x'.repeat(129) })).password);
    assert.doesNotThrow(() => validateRegistration({ ...valid, password: 'x'.repeat(128) }));
  });

  it('rejects malformed and overlong emails', () => {
    for (const email of ['asha', 'asha@', 'asha@example', 'as ha@example.com', `${'a'.repeat(250)}@example.com`]) {
      assert.ok(fieldErrors(() => validateRegistration({ ...valid, email })).email, email);
    }
  });

  it('rejects an overlong name', () => {
    assert.ok(fieldErrors(() => validateRegistration({ ...valid, name: 'a'.repeat(101) })).name);
  });

  it('handles a missing body', () => {
    assert.deepEqual(Object.keys(fieldErrors(() => validateRegistration(undefined))).sort(), ['email', 'name', 'password']);
  });

  it('ignores non-string values', () => {
    const fields = fieldErrors(() =>
      validateRegistration({ name: ['Asha'], email: { $ne: null }, password: 123456789012 }),
    );
    assert.deepEqual(Object.keys(fields).sort(), ['email', 'name', 'password']);
  });
});

describe('validateLogin', () => {
  it('normalizes the email but not the password', () => {
    assert.deepEqual(validateLogin({ email: ' A@B.co ', password: ' Secret ' }), { email: 'a@b.co', password: ' Secret ' });
  });

  it('requires both fields', () => {
    assert.deepEqual(Object.keys(fieldErrors(() => validateLogin({ email: { $gt: '' } }))).sort(), ['email', 'password']);
  });
});
