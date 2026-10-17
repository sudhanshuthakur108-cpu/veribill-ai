import mongoose from 'mongoose';
import { Invoice } from './models/Invoice.js';
import { PurchaseOrder } from './models/PurchaseOrder.js';
import { Session } from './models/Session.js';
import { User } from './models/User.js';

export async function connectDatabase(uri) {
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
  // Wait for the unique and session expiry indexes before serving requests, so
  // duplicate checks hold from the very first request.
  await Promise.all([User.init(), Session.init(), PurchaseOrder.init(), Invoice.init()]);
}

export function disconnectDatabase() {
  return mongoose.disconnect();
}
