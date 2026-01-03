import { Router } from 'express';
import { VacationService } from '../services/vacation-service';
import { authenticateToken } from '../middleware/auth';
import { requireAdmin } from '../middleware/admin-auth';
import { validateBody } from '../middleware/validate';
import { auditMiddleware } from '../middleware/audit';
import { createVacationDaySchema, createVacationRangeSchema, updateVacationDaySchema } from '@vsol-admin/shared';
import { ValidationError, ForbiddenError } from '../middleware/errors';
import { eq } from 'drizzle-orm';
import { db, users, vacationDays } from '../db';

const router: Router = Router();

// All vacation routes require authentication
router.use(authenticateToken);

// Helper to get consultantId from user if they're a consultant
async function getConsultantIdFromUser(userId: number): Promise<number | null> {
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: { consultantId: true, role: true }
  });
  return user?.role === 'consultant' ? (user.consultantId || null) : null;
}

// GET /api/vacations - Get all vacations (with optional date filters)
// Consultants see only their own, admins see all
router.get('/', async (req, res, next) => {
  try {
    const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
    const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;
    const userId = (req as any).user?.userId;
    
    // If consultant, filter to their own vacations
    const consultantId = await getConsultantIdFromUser(userId);
    if (consultantId) {
      const vacations = await VacationService.getByConsultantId(consultantId, startDate, endDate);
      return res.json(vacations);
    }
    
    // Admin sees all
    const vacations = await VacationService.getAll(startDate, endDate);
    res.json(vacations);
  } catch (error) {
    next(error);
  }
});

// GET /api/vacations/balances - Get vacation balances for all consultants (admin only)
router.get('/balances', async (req, res, next) => {
  try {
    const userId = (req as any).user?.userId;
    const consultantId = await getConsultantIdFromUser(userId);
    
    // Consultants can only see their own balance
    if (consultantId) {
      const referenceDate = req.query.referenceDate ? new Date(req.query.referenceDate as string) : new Date();
      const balance = await VacationService.getBalance(consultantId, referenceDate);
      return res.json([balance]);
    }
    
    // Admin sees all
    const referenceDate = req.query.referenceDate ? new Date(req.query.referenceDate as string) : new Date();
    const balances = await VacationService.getAllBalances(referenceDate);
    res.json(balances);
  } catch (error) {
    next(error);
  }
});

// GET /api/vacations/consultant/:id - Get vacations for a specific consultant (admin only)
router.get('/consultant/:id', requireAdmin, async (req, res, next) => {
  try {
    const consultantId = parseInt(req.params.id);
    const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
    const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;
    
    const vacations = await VacationService.getByConsultantId(consultantId, startDate, endDate);
    res.json(vacations);
  } catch (error) {
    next(error);
  }
});

// GET /api/vacations/consultant/:id/balance - Get vacation balance for a consultant (admin only)
router.get('/consultant/:id/balance', requireAdmin, async (req, res, next) => {
  try {
    const consultantId = parseInt(req.params.id);
    const referenceDate = req.query.referenceDate ? new Date(req.query.referenceDate as string) : new Date();
    
    const balance = await VacationService.getBalance(consultantId, referenceDate);
    res.json(balance);
  } catch (error) {
    next(error);
  }
});

// GET /api/vacations/calendar - Get vacations formatted for calendar view
// Consultants see only their own, admins see all
router.get('/calendar', async (req, res, next) => {
  try {
    if (!req.query.startDate || !req.query.endDate) {
      throw new ValidationError('startDate and endDate query parameters are required');
    }
    
    const startDate = new Date(req.query.startDate as string);
    const endDate = new Date(req.query.endDate as string);
    const userId = (req as any).user?.userId;
    
    // If consultant, filter to their own vacations
    const consultantId = await getConsultantIdFromUser(userId);
    if (consultantId) {
      const vacations = await VacationService.getByConsultantId(consultantId, startDate, endDate);
      const events = vacations.map(v => ({
        date: v.vacationDate.toISOString().split('T')[0],
        consultantId: v.consultantId,
        consultantName: 'Me', // Consultant sees their own name as "Me"
        notes: v.notes
      }));
      return res.json(events);
    }
    
    // Admin sees all
    const events = await VacationService.getCalendarEvents(startDate, endDate);
    res.json(events);
  } catch (error) {
    next(error);
  }
});

// POST /api/vacations - Create single vacation day
// Consultants can only create for themselves
router.post('/',
  validateBody(createVacationDaySchema),
  auditMiddleware('CREATE_VACATION_DAY', 'vacation_day'),
  async (req, res, next) => {
    try {
      const userId = (req as any).user?.userId;
      const consultantId = await getConsultantIdFromUser(userId);
      
      // If consultant, force consultantId to their own
      if (consultantId) {
        if (req.body.consultantId && req.body.consultantId !== consultantId) {
          throw new ForbiddenError('You can only create vacations for yourself');
        }
        req.body.consultantId = consultantId;
      }
      
      const vacation = await VacationService.createDay(req.body, userId);
      res.status(201).json(vacation);
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/vacations/range - Create vacation range (multiple days)
// Consultants can only create for themselves
router.post('/range',
  validateBody(createVacationRangeSchema),
  auditMiddleware('CREATE_VACATION_RANGE', 'vacation_day'),
  async (req, res, next) => {
    try {
      const userId = (req as any).user?.userId;
      const consultantId = await getConsultantIdFromUser(userId);
      
      // If consultant, force consultantId to their own
      if (consultantId) {
        if (req.body.consultantId && req.body.consultantId !== consultantId) {
          throw new ForbiddenError('You can only create vacations for yourself');
        }
        req.body.consultantId = consultantId;
      }
      
      const vacations = await VacationService.createRange(req.body, userId);
      res.status(201).json(vacations);
    } catch (error) {
      next(error);
    }
  }
);

// PUT /api/vacations/:id - Update vacation day
// Consultants can only update their own
router.put('/:id',
  validateBody(updateVacationDaySchema),
  auditMiddleware('UPDATE_VACATION_DAY', 'vacation_day'),
  async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      const userId = (req as any).user?.userId;
      const consultantId = await getConsultantIdFromUser(userId);
      
      // If consultant, verify ownership
      if (consultantId) {
        const vacation = await db.query.vacationDays.findFirst({
          where: eq(vacationDays.id, id)
        });
        if (!vacation || vacation.consultantId !== consultantId) {
          throw new ForbiddenError('You can only update your own vacations');
        }
      }
      
      const vacation = await VacationService.updateDay(id, req.body);
      res.json(vacation);
    } catch (error) {
      next(error);
    }
  }
);

// DELETE /api/vacations/:id - Delete vacation day
// Consultants can only delete their own
router.delete('/:id',
  auditMiddleware('DELETE_VACATION_DAY', 'vacation_day'),
  async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      const userId = (req as any).user?.userId;
      const consultantId = await getConsultantIdFromUser(userId);
      
      // If consultant, verify ownership
      if (consultantId) {
        const vacation = await db.query.vacationDays.findFirst({
          where: eq(vacationDays.id, id)
        });
        if (!vacation || vacation.consultantId !== consultantId) {
          throw new ForbiddenError('You can only delete your own vacations');
        }
      }
      
      const result = await VacationService.deleteDay(id);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

export default router;

