const DEFAULT_PORT = 4000;

export function loadConfig(env = process.env) {
  return {
    port: parsePort(env.PORT),
    nodeEnv: env.NODE_ENV || 'development',
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
