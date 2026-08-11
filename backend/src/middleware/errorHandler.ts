import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/errors';

export function errorHandler(
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      error: err.message,
      ...(err.details ? { details: err.details } : {})
    });
  }

  if (err instanceof SyntaxError && 'status' in err && (err as any).status === 400) {
    return res.status(400).json({ error: 'Invalid JSON body' });
  }

  console.error('Unhandled Server Error:', err);
  return res.status(500).json({
    error: 'Unhandled server error'
  });
}
