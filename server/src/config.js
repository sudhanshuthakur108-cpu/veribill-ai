const DEFAULT_PORT = 4000;
const DEFAULT_MONGODB_URI = 'mongodb://127.0.0.1:27017/veribill';
const DEFAULT_SESSION_TTL_HOURS = 8;
const MAX_SESSION_TTL_HOURS = 24 * 30;

export function loadConfig(env = process.env) {
  const nodeEnv = env.NODE_ENV || 'development';
  const isProduction = nodeEnv === 'production';

  return {
    port: parsePort(env.PORT),
    nodeEnv,
    isProduction,
    mongodbUri: parseMongodbUri(env.MONGODB_URI, isProduction),
    sessionTtlMs: parseSessionTtlHours(env.SESSION_TTL_HOURS) * 60 * 60 * 1000,
    trustedOrigins: parseTrustedOrigins(env.TRUSTED_ORIGINS),
  };
}

function parsePort(value) {
  if (value === undefined || value === '') {
    return DEFAULT_PORT;
  }

  const port = Number(value);
  if (!Number.isInteger(port) || port < 0 || port > 65535) {
    throw new Error(`Invalid PORT "${value}": expected an integer between 0 and 65535.`);
  }
  return port;
}

function parseMongodbUri(value, isProduction) {
  if (!value) {
    if (isProduction) {
      throw new Error('MONGODB_URI is required in production.');
    }
    return DEFAULT_MONGODB_URI;
  }

  if (!/^mongodb(\+srv)?:\/\//.test(value)) {
    throw new Error('Invalid MONGODB_URI: expected a mongodb:// or mongodb+srv:// connection string.');
  }
  return value;
}

function parseSessionTtlHours(value) {
  if (value === undefined || value === '') {
    return DEFAULT_SESSION_TTL_HOURS;
  }

  const hours = Number(value);
  if (!Number.isFinite(hours) || hours <= 0 || hours > MAX_SESSION_TTL_HOURS) {
    throw new Error(`Invalid SESSION_TTL_HOURS "${value}": expected a number above 0 and at most ${MAX_SESSION_TTL_HOURS}.`);
  }
  return hours;
}

function parseTrustedOrigins(value) {
  if (!value) {
    return [];
  }

  return value
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean)
    .map((origin) => {
      if (!URL.canParse(origin) || new URL(origin).origin !== origin) {
        throw new Error(`Invalid TRUSTED_ORIGINS entry "${origin}": expected an origin such as https://app.example.com.`);
      }
      return origin;
    });
}
