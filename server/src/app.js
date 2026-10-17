import cookieParser from 'cookie-parser';
import express from 'express';
import { loadSession } from './middleware/auth.js';
import { errorHandler, notFound } from './middleware/errors.js';
import { verifyOrigin } from './middleware/verifyOrigin.js';
import { createAuthRouter } from './routes/auth.js';
import { healthRouter } from './routes/health.js';
import { invoicesRouter } from './routes/invoices.js';
import { purchaseOrdersRouter } from './routes/purchaseOrders.js';

export function createApp(config) {
  const app = express();

  app.disable('x-powered-by');

  app.use('/api', verifyOrigin(config.trustedOrigins));
  app.use(express.json({ limit: '10kb' }));
  app.use(cookieParser());

  // Health stays ahead of session loading so it keeps answering when the database is down.
  app.use('/api/health', healthRouter);

  app.use('/api', loadSession);
  app.use('/api/auth', createAuthRouter(config));
  app.use('/api/purchase-orders', purchaseOrdersRouter);
  app.use('/api/invoices', invoicesRouter);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
