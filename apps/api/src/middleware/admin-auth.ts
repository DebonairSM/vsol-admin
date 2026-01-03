import { Request, Response, NextFunction } from 'express';
import { ForbiddenError } from './errors';
import { authenticateToken } from './auth';

/**
 * Middleware to ensure user has 'admin' role
 * Must be used after authenticateToken
 */
export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  if (req.user.role !== 'admin') {
    throw new ForbiddenError('Admin access required');
  }

  next();
}

/**
 * Combined middleware: authenticate + require admin role
 */
export const authenticateAdmin = [authenticateToken, requireAdmin];
