// Runs a local MongoDB for development using the binary that mongodb-memory-server
// already manages for the test suite, so no separate MongoDB install is needed.
// Data is kept in server/.data/mongodb between runs. Not for production use.
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { MongoMemoryServer } from 'mongodb-memory-server';

const PORT = 27017;
const dbPath = fileURLToPath(new URL('../.data/mongodb', import.meta.url));

await mkdir(dbPath, { recursive: true });

let mongod;
try {
  mongod = await MongoMemoryServer.create({
    // portGeneration: false makes startup fail instead of silently picking another
    // port, which would leave the API talking to whatever already owns 27017.
    instance: { ip: '127.0.0.1', port: PORT, portGeneration: false, dbPath, storageEngine: 'wiredTiger' },
  });
} catch (error) {
  console.error(`Could not start the local MongoDB on 127.0.0.1:${PORT}: ${error.message}`);
  console.error('Is another MongoDB (or another `npm run db`) already running?');
  process.exit(1);
}

console.log(`Local MongoDB listening on ${mongod.getUri()} (data in server/.data/mongodb)`);
console.log('Press Ctrl+C to stop.');

async function stop() {
  await mongod.stop({ doCleanup: false });
  process.exit(0);
}

process.on('SIGINT', stop);
process.on('SIGTERM', stop);
