import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { UnauthorizedError } from '../utils/errors';

export interface JwtPayload {
  id: string;
  name: string;
  email: string;
  role: 'Admin' | 'Sales' | 'Warehouse' | 'Accounts';
}

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(new UnauthorizedError('Missing/invalid token'));
  }

  const token = authHeader.split(' ')[1];
  try {
    const secret = process.env.JWT_SECRET || 'super-secret-jwt-key-for-mini-erp-crm-2026';
    const decoded = jwt.verify(token, secret) as JwtPayload;
    req.user = decoded;
    next();
  } catch (error) {
    return next(new UnauthorizedError('Invalid or expired token'));
  }
}
