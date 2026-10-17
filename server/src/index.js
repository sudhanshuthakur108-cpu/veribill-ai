import { createApp } from './app.js';
import { loadConfig } from './config.js';
import { connectDatabase, disconnectDatabase } from './db.js';

const config = loadConfig();

try {
  await connectDatabase(config.mongodbUri);
} catch (error) {
  // The connection string can contain credentials, so only the driver's message is logged.
  console.error(`Could not connect to MongoDB: ${error.message}`);
  console.error('Start a local database with `npm run db`, or set MONGODB_URI in server/.env.');
  process.exit(1);
}

const app = createApp(config);

const server = app.listen(config.port, (error) => {
  if (error) {
    console.error(`Could not start the API on port ${config.port}: ${error.message}`);
    process.exit(1);
  }
  console.log(`VeriBill API (${config.nodeEnv}) listening on http://localhost:${config.port}`);
});

function shutdown(signal) {
  console.log(`${signal} received, closing the API server`);
  server.close(async () => {
    await disconnectDatabase();
    process.exit(0);
  });
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
