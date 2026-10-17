import { createApp } from './app.js';
import { loadConfig } from './config.js';

const config = loadConfig();
const app = createApp();

const server = app.listen(config.port, (error) => {
  if (error) {
    console.error(`Could not start the API on port ${config.port}: ${error.message}`);
    process.exit(1);
  }
  console.log(`VeriBill API (${config.nodeEnv}) listening on http://localhost:${config.port}`);
});

function shutdown(signal) {
  console.log(`${signal} received, closing the API server`);
  server.close(() => process.exit(0));
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
