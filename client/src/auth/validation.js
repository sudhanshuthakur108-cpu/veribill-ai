// Mirrors the server rules so people get instant feedback. The server still
// validates every request; these checks are only for convenience.
export const PASSWORD_MIN_LENGTH = 12;
export const PASSWORD_MAX_LENGTH = 128;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function checkEmail(email) {
  const trimmed = email.trim();
  if (!trimmed) return 'Enter your email address.';
  if (trimmed.length > 254 || !EMAIL_PATTERN.test(trimmed)) return 'Enter a valid email address.';
  return null;
}

function withoutEmpty(errors) {
  return Object.fromEntries(Object.entries(errors).filter(([, message]) => message));
}

export function validateLogin({ email, password }) {
  return withoutEmpty({
    email: email.trim() ? null : 'Enter your email address.',
    password: password ? null : 'Enter your password.',
  });
}

export function validateRegistration({ name, email, password }) {
  let passwordError = null;
  if (password.length < PASSWORD_MIN_LENGTH) {
    passwordError = `Password must be at least ${PASSWORD_MIN_LENGTH} characters.`;
  } else if (password.length > PASSWORD_MAX_LENGTH) {
    passwordError = `Password must be ${PASSWORD_MAX_LENGTH} characters or fewer.`;
  }

  return withoutEmpty({
    name: name.trim() ? null : 'Enter your name.',
    email: checkEmail(email),
    password: passwordError,
  });
}
