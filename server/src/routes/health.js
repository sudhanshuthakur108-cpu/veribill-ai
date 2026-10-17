import { Router } from 'express';
import packageJson from '../../package.json' with { type: 'json' };

export const healthRouter = Router();

healthRouter.get('/', (req, res) => {
  res.set('Cache-Control', 'no-store');
  res.json({
    status: 'ok',
    service: 'veribill-api',
    version: packageJson.version,
    uptimeSeconds: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
  });
});
