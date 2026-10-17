import mongoose from 'mongoose';
import { Session } from './models/Session.js';
import { User } from './models/User.js';

export async function connectDatabase(uri) {
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
  // Wait for the unique email and session expiry indexes before serving requests.
  await Promise.all([User.init(), Session.init()]);
}

export function disconnectDatabase() {
  return mongoose.disconnect();
}
