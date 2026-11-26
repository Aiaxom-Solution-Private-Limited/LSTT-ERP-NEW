import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';

export class HttpError extends Error {
  constructor(public status: number, message: string, public details?: unknown) {
    super(message);
  }
}
export const badRequest = (m: string, d?: unknown) => new HttpError(400, m, d);
export const forbidden = (m = 'You do not have permission for this action') => new HttpError(403, m);
export const notFound = (m = 'Not found') => new HttpError(404, m);
export const conflict = (m: string, d?: unknown) => new HttpError(409, m, d);

/** Wraps async route handlers so thrown errors reach the error middleware. */
export const ah = (fn: (req: Request, res: Response) => Promise<unknown>) => (req: Request, res: Response, next: NextFunction) =>
  fn(req, res).catch(next);

export function errorHandler(err: any, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof HttpError) return res.status(err.status).json({ error: err.message, details: err.details });
  if (err instanceof ZodError) return res.status(400).json({ error: 'Validation failed', details: err.flatten() });
  // Postgres unique violation
  if (err?.code === '23505') return res.status(409).json({ error: 'Duplicate record', details: err.detail ?? err.message });
  if (err?.code === '23503') return res.status(400).json({ error: 'Referenced record does not exist', details: err.detail ?? err.message });
  if (err?.code === '23514') return res.status(400).json({ error: 'Constraint violated', details: err.detail ?? err.message });
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
}
