// Responses with a user's own data must not be kept by browser or proxy caches.
export function noStore(req, res, next) {
  res.set('Cache-Control', 'no-store');
  next();
}
