import { HttpError } from '../httpError.js';

export const NAME_MAX_LENGTH = 100;
export const EMAIL_MAX_LENGTH = 254;
export const PASSWORD_MIN_LENGTH = 12;
export const PASSWORD_MAX_LENGTH = 128;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeEmail(email) {
  return email.trim().toLowerCase();
}

// Non-string values (including objects such as { "$gt": "" }) are treated as missing,
// so request bodies can never smuggle query operators into database lookups.
function readString(body, field) {
  const value = body?.[field];
  return typeof value === 'string' ? value : '';
}

// The same password can arrive as different code points depending on the keyboard or
// operating system (for example "é" precomposed or as "e" plus an accent), so it is
// normalized before hashing and before verifying, as NIST SP 800-63B recommends.
function readPassword(body) {
  return readString(body, 'password').normalize('NFKC');
}

export function validateRegistration(body) {
  const name = readString(body, 'name').trim();
  const email = normalizeEmail(readString(body, 'email'));
  const password = readPassword(body);
  const fields = {};

  if (!name) {
    fields.name = 'Enter your name.';
  } else if (name.length > NAME_MAX_LENGTH) {
    fields.name = `Name must be ${NAME_MAX_LENGTH} characters or fewer.`;
  }

  if (!email) {
    fields.email = 'Enter your email address.';
  } else if (email.length > EMAIL_MAX_LENGTH || !EMAIL_PATTERN.test(email)) {
    fields.email = 'Enter a valid email address.';
  }

  if (password.length < PASSWORD_MIN_LENGTH) {
    fields.password = `Password must be at least ${PASSWORD_MIN_LENGTH} characters.`;
  } else if (password.length > PASSWORD_MAX_LENGTH) {
    fields.password = `Password must be ${PASSWORD_MAX_LENGTH} characters or fewer.`;
  }

  if (Object.keys(fields).length > 0) {
    throw new HttpError(400, 'Please correct the highlighted fields.', fields);
  }
  return { name, email, password };
}

export function validateLogin(body) {
  const email = normalizeEmail(readString(body, 'email'));
  const password = readPassword(body);
  const fields = {};

  if (!email) {
    fields.email = 'Enter your email address.';
  }
  if (!password) {
    fields.password = 'Enter your password.';
  }

  if (Object.keys(fields).length > 0) {
    throw new HttpError(400, 'Please correct the highlighted fields.', fields);
  }
  return { email, password };
}
