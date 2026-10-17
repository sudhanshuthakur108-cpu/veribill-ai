import { HttpError } from '../httpError.js';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

// Rejects state-changing requests that a browser marks as coming from another site.
// Modern browsers send Sec-Fetch-Site; older ones fall back to the Origin header.
// Requests with neither header come from non-browser clients, which cannot be used
// for cross-site request forgery.
export function verifyOrigin(trustedOrigins) {
  return (req, res, next) => {
    if (SAFE_METHODS.has(req.method)) {
      return next();
    }

    const fetchSite = req.get('Sec-Fetch-Site');
    const origin = req.get('Origin');

    if (fetchSite === 'same-origin' || fetchSite === 'none') {
      return next();
    }
    if (origin && trustedOrigins.includes(origin)) {
      return next();
    }
    if (!fetchSite && !origin) {
      return next();
    }

    next(new HttpError(403, 'Cross-origin request blocked.'));
  };
}
