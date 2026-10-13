import { ZodError } from 'zod';
import { AppError } from '../errors/AppError.js';

// Central error handler enforcing the strict JSON error shape: { error: message }
export const errorHandler = (err, req, res, next) => {
  // Handle payload too large error from body-parser
  if (err?.type === 'entity.too.large' || err?.status === 413 || err?.statusCode === 413) {
    return res.status(413).json({ error: 'Payload too large: Request body exceeds the 100kb limit.' });
  }

  // Handle Zod schema validation errors
  if (err instanceof ZodError) {
    const message = err.issues.map((i) => i.message).join(', ');
    return res.status(400).json({ error: message });
  }

  // Handle custom application domain errors
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({ error: err.message });
  }

  // Handle common Prisma error codes
  if (err?.code === 'P2002') {
    const target = Array.isArray(err?.meta?.target) ? err.meta.target.join(', ') : 'field';
    return res.status(409).json({ error: `A record with this ${target} already exists.` });
  }
  if (err?.code === 'P2025') {
    return res.status(404).json({ error: 'Requested record was not found.' });
  }

  // Handle JWT errors
  if (err?.name === 'JsonWebTokenError' || err?.name === 'TokenExpiredError') {
    return res.status(401).json({ error: 'Invalid or expired authentication token.' });
  }

  // Handle HTTP client errors with explicit status code
  if (err?.status && err.status >= 400 && err.status < 500) {
    return res.status(err.status).json({ error: err.message });
  }

  // Fallback 500 internal server error
  console.error('[Unhandled Error]', err);
  return res.status(500).json({
    error: err.message || 'Internal server error'
  });
};
