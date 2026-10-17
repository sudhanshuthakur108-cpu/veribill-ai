import { randomBytes } from 'node:crypto';
import argon2 from 'argon2';

export function hashPassword(password) {
  return argon2.hash(password, { type: argon2.argon2id });
}

export function verifyPassword(hash, password) {
  return argon2.verify(hash, password);
}

// Checked when no account matches the email, so a failed login takes about the
// same time whether or not the account exists.
const unusedHash = hashPassword(randomBytes(32).toString('base64url'));

export async function verifyAgainstUnusedHash(password) {
  await argon2.verify(await unusedHash, password);
  return false;
}
