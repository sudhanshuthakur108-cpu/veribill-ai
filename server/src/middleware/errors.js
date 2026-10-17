export function notFound(req, res) {
  res.status(404).json({
    error: { message: `Route not found: ${req.method} ${req.originalUrl}` },
  });
}

// Express only treats middleware as an error handler when it declares four parameters.
export function errorHandler(err, req, res, next) {
  if (res.headersSent) {
    return next(err);
  }

  const status = Number.isInteger(err.status) && err.status >= 400 && err.status < 600 ? err.status : 500;

  // Server errors can carry internal details, so the client only gets a generic message.
  if (status >= 500) {
    console.error(err);
    return res.status(status).json({ error: { message: 'Internal server error' } });
  }

  const error = { message: err.message };
  if (err.fields) {
    error.fields = err.fields;
  }
  res.status(status).json({ error });
}
