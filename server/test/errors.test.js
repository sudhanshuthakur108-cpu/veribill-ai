import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { HttpError } from '../src/httpError.js';
import { errorHandler } from '../src/middleware/errors.js';

function createResponse() {
  return {
    headersSent: false,
    statusCode: 200,
    body: undefined,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
  };
}

describe('errorHandler', () => {
  it('passes through client error messages', () => {
    const res = createResponse();
    const err = Object.assign(new Error('Invoice number is required'), { status: 400 });

    errorHandler(err, {}, res, () => {});

    assert.equal(res.statusCode, 400);
    assert.deepEqual(res.body, { error: { message: 'Invoice number is required' } });
  });

  it('includes field errors for client errors', () => {
    const res = createResponse();

    errorHandler(new HttpError(400, 'Please correct the highlighted fields.', { email: 'Enter your email address.' }), {}, res, () => {});

    assert.deepEqual(res.body, {
      error: { message: 'Please correct the highlighted fields.', fields: { email: 'Enter your email address.' } },
    });
  });

  it('never includes field details on server errors', (t) => {
    t.mock.method(console, 'error', () => {});
    const res = createResponse();

    errorHandler(new HttpError(500, 'boom', { secret: 'internal' }), {}, res, () => {});

    assert.deepEqual(res.body, { error: { message: 'Internal server error' } });
  });

  it('hides internal details on server errors', (t) => {
    t.mock.method(console, 'error', () => {});
    const res = createResponse();

    errorHandler(new Error('connect ECONNREFUSED 10.0.0.5:27017'), {}, res, () => {});

    assert.equal(res.statusCode, 500);
    assert.deepEqual(res.body, { error: { message: 'Internal server error' } });
    assert.equal(console.error.mock.callCount(), 1);
  });

  it('treats an out-of-range status as a server error', (t) => {
    t.mock.method(console, 'error', () => {});
    const res = createResponse();

    errorHandler(Object.assign(new Error('odd'), { status: 302 }), {}, res, () => {});

    assert.equal(res.statusCode, 500);
  });

  it('delegates to Express once headers are sent', () => {
    const res = { ...createResponse(), headersSent: true };
    const err = new Error('stream failed');
    let forwarded;

    errorHandler(err, {}, res, (value) => {
      forwarded = value;
    });

    assert.equal(forwarded, err);
    assert.equal(res.body, undefined);
  });
});
