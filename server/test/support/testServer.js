import { once } from 'node:events';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { createApp } from '../../src/app.js';
import { loadConfig } from '../../src/config.js';
import { connectDatabase, disconnectDatabase } from '../../src/db.js';

export async function startTestDatabase() {
  const mongod = await MongoMemoryServer.create();
  await connectDatabase(mongod.getUri());

  return async () => {
    await disconnectDatabase();
    await mongod.stop();
  };
}

// deleteMany keeps the indexes in place, unlike dropping the database.
export async function clearDatabase() {
  await Promise.all(Object.values(mongoose.connection.collections).map((collection) => collection.deleteMany({})));
}

// A fresh app per test also means fresh rate-limit counters.
export async function startTestServer(env = {}) {
  const server = createApp(loadConfig(env)).listen(0, '127.0.0.1');
  await once(server, 'listening');

  return {
    baseUrl: `http://127.0.0.1:${server.address().port}`,
    close: () => new Promise((resolve) => server.close(resolve)),
  };
}
