import { Request, Response, NextFunction } from 'express';
import { authenticateToken } from './auth';
import { UnauthorizedError, ForbiddenError } from './errors';
import { eq } from 'drizzle-orm';
import { db, users } from '../db';

/**
 * Middleware to ensure user has 'consultant' role
 * Must be used after authenticateToken
 */
export function requireConsultantRole(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  if (req.user.role !== 'consultant') {
    throw new ForbiddenError('This endpoint is only accessible to consultants');
  }

  next();
}

/**
 * Middleware to ensure consultant can only access their own data
 * Validates that the consultantId in the request matches the authenticated user's consultantId
 * Must be used after authenticateToken and requireConsultantRole
 */
export async function requireOwnConsultant(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  // Get user's consultantId
  const user = await db.query.users.findFirst({
    where: eq(users.id, req.user.userId),
    columns: {
      consultantId: true
    }
  });

  if (!user || !user.consultantId) {
    throw new UnauthorizedError('User is not linked to a consultant');
  }

  // Check if request is trying to access a different consultant's data
  const requestedConsultantId = req.params.consultantId 
    ? parseInt(req.params.consultantId)
    : req.body.consultantId;

  if (requestedConsultantId && requestedConsultantId !== user.consultantId) {
    throw new ForbiddenError('You can only access your own data');
  }

  // Attach consultantId to request for use in route handlers
  (req as any).consultantId = user.consultantId;

  next();
}

/**
 * Combined middleware: authenticate + require consultant role
 */
export const authenticateConsultant = [authenticateToken, requireConsultantRole];

/**
 * Combined middleware: authenticate + require consultant role + require own data
 */
export const authenticateOwnConsultant = [authenticateToken, requireConsultantRole, requireOwnConsultant];




