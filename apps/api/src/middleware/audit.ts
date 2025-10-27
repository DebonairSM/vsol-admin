import { Request, Response, NextFunction } from 'express';
import { db, auditLogs } from '../db';

export interface AuditLogData {
  action: string;
  entityType: string;
  entityId: number;
  changes: Record<string, any>;
  cycleId?: number;
}

export async function createAuditLog(userId: number, data: AuditLogData) {
  await db.insert(auditLogs).values({
    userId,
    action: data.action,
    entityType: data.entityType,
    entityId: data.entityId,
    changes: JSON.stringify(data.changes),
    cycleId: data.cycleId || null
  });
}

// Middleware to automatically log mutations
export function auditMiddleware(action: string, entityType: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const originalSend = res.send;
    
    res.send = function(data) {
      // Only log successful mutations (2xx status codes)
      if (res.statusCode >= 200 && res.statusCode < 300 && req.user) {
        const entityId = parseInt(req.params.id) || 0;
        const changes = req.method === 'DELETE' ? { deleted: true } : req.body;
        
        createAuditLog(req.user.userId, {
          action,
          entityType,
          entityId,
          changes,
          cycleId: req.body?.cycleId || req.params.cycleId ? parseInt(req.params.cycleId) : undefined
        }).catch(console.error);
      }
      
      return originalSend.call(this, data);
    };
    
    next();
  };
}
