import { Router } from 'express';
import { eq, and } from 'drizzle-orm';
import { db, auditLogs } from '../db';
import { authenticateToken } from '../middleware/auth';
import { validateQuery } from '../middleware/validate';
import { z } from 'zod';

const router = Router();

// All audit routes require authentication
router.use(authenticateToken);

const querySchema = z.object({
  cycleId: z.string().transform(Number).optional(),
  userId: z.string().transform(Number).optional(),
  limit: z.string().transform(Number).default(50),
  offset: z.string().transform(Number).default(0)
});

// GET /api/audit
router.get('/',
  validateQuery(querySchema),
  async (req, res, next) => {
    try {
      const { cycleId, userId, limit, offset } = req.query as any;
      
      let whereConditions = [];
      if (cycleId) whereConditions.push(eq(auditLogs.cycleId, cycleId));
      if (userId) whereConditions.push(eq(auditLogs.userId, userId));
      
      const whereClause = whereConditions.length > 0 
        ? whereConditions.length === 1 
          ? whereConditions[0] 
          : and(...whereConditions)
        : undefined;

      const logs = await db.query.auditLogs.findMany({
        where: whereClause,
        with: {
          user: {
            columns: {
              id: true,
              username: true,
              role: true
            }
          },
          cycle: {
            columns: {
              id: true,
              monthLabel: true
            }
          }
        },
        orderBy: (auditLogs, { desc }) => [desc(auditLogs.timestamp)],
        limit,
        offset
      });

      // Parse JSON changes field
      const logsWithParsedChanges = logs.map(log => ({
        ...log,
        changes: JSON.parse(log.changes)
      }));

      res.json(logsWithParsedChanges);
    } catch (error) {
      next(error);
    }
  }
);

export default router;
