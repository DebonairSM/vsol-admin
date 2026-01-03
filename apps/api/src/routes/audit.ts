import { Router } from 'express';
import { eq, and } from 'drizzle-orm';
import { db, auditLogs } from '../db';
import { authenticateAdmin } from '../middleware/admin-auth';
import { validateQuery } from '../middleware/validate';
import { z } from 'zod';

const router: Router = Router();

// All audit routes require admin authentication
router.use(authenticateAdmin);

const querySchema = z.object({
  cycleId: z.string().transform(Number).optional(),
  userId: z.string().transform(Number).optional(),
  limit: z.string().default('50').transform(Number),
  offset: z.string().default('0').transform(Number)
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
