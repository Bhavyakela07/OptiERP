import { Request, Response, NextFunction } from 'express';
import { ForbiddenError } from '../utils/errors';

export type Role = 'Admin' | 'Sales' | 'Warehouse' | 'Accounts';

export function requireRole(...allowedRoles: Role[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new ForbiddenError());
    }

    if (!allowedRoles.includes(req.user.role as Role)) {
      return next(new ForbiddenError('Authenticated but role not permitted'));
    }

    next();
  };
}
