import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { connectDatabase, disconnectDatabase } from '../src/db.js';

let mongod;

before(async () => {
  mongod = await MongoMemoryServer.create();
});

after(async () => {
  await mongod.stop();
});

describe('connectDatabase', () => {
  it('refuses to start when existing data breaks the unique email index', async () => {
    const uri = `${mongod.getUri()}duplicates`;
    const raw = await mongoose.createConnection(uri).asPromise();
    await raw.collection('users').insertMany([
      { name: 'A', email: 'same@example.com', passwordHash: 'x' },
      { name: 'B', email: 'same@example.com', passwordHash: 'y' },
    ]);
    await raw.close();

    try {
      await assert.rejects(connectDatabase(uri), { code: 11000 });
    } finally {
      await disconnectDatabase();
    }
  });

  it('creates the unique email and session expiry indexes before returning', async () => {
    await connectDatabase(`${mongod.getUri()}indexes`);

    try {
      const userIndexes = await mongoose.connection.collection('users').indexes();
      const sessionIndexes = await mongoose.connection.collection('sessions').indexes();

      const orderIndexes = await mongoose.connection.collection('purchaseorders').indexes();
      const invoiceIndexes = await mongoose.connection.collection('invoices').indexes();

      assert.ok(userIndexes.some((index) => index.key.email === 1 && index.unique));
      assert.ok(sessionIndexes.some((index) => index.key.expiresAt === 1 && index.expireAfterSeconds === 0));
      assert.ok(
        orderIndexes.some((index) => index.unique && Object.keys(index.key).join() === 'createdBy,poNumberKey'),
      );
      assert.ok(
        invoiceIndexes.some(
          (index) => index.unique && Object.keys(index.key).join() === 'createdBy,supplierKey,invoiceNumberKey',
        ),
      );
    } finally {
      await disconnectDatabase();
    }
  });
});
