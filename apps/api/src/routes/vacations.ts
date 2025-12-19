import { Router } from 'express';
import { VacationService } from '../services/vacation-service';
import { authenticateToken } from '../middleware/auth';
import { validateBody } from '../middleware/validate';
import { auditMiddleware } from '../middleware/audit';
import { createVacationDaySchema, createVacationRangeSchema, updateVacationDaySchema } from '@vsol-admin/shared';
import { ValidationError } from '../middleware/errors';

const router: Router = Router();

// All vacation routes require authentication
router.use(authenticateToken);

// GET /api/vacations - Get all vacations (with optional date filters)
router.get('/', async (req, res, next) => {
  try {
    const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
    const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;
    
    const vacations = await VacationService.getAll(startDate, endDate);
    res.json(vacations);
  } catch (error) {
    next(error);
  }
});

// GET /api/vacations/balances - Get vacation balances for all consultants
router.get('/balances', async (req, res, next) => {
  try {
    const referenceDate = req.query.referenceDate ? new Date(req.query.referenceDate as string) : new Date();
    const balances = await VacationService.getAllBalances(referenceDate);
    res.json(balances);
  } catch (error) {
    next(error);
  }
});

// GET /api/vacations/consultant/:id - Get vacations for a specific consultant
router.get('/consultant/:id', async (req, res, next) => {
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

// GET /api/vacations/consultant/:id/balance - Get vacation balance for a consultant
router.get('/consultant/:id/balance', async (req, res, next) => {
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
router.get('/calendar', async (req, res, next) => {
  try {
    if (!req.query.startDate || !req.query.endDate) {
      throw new ValidationError('startDate and endDate query parameters are required');
    }
    
    const startDate = new Date(req.query.startDate as string);
    const endDate = new Date(req.query.endDate as string);
    
    const events = await VacationService.getCalendarEvents(startDate, endDate);
    res.json(events);
  } catch (error) {
    next(error);
  }
});

// POST /api/vacations - Create single vacation day
router.post('/',
  validateBody(createVacationDaySchema),
  auditMiddleware('CREATE_VACATION_DAY', 'vacation_day'),
  async (req, res, next) => {
    try {
      const userId = (req as any).user?.id;
      const vacation = await VacationService.createDay(req.body, userId);
      res.status(201).json(vacation);
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/vacations/range - Create vacation range (multiple days)
router.post('/range',
  validateBody(createVacationRangeSchema),
  auditMiddleware('CREATE_VACATION_RANGE', 'vacation_day'),
  async (req, res, next) => {
    try {
      const userId = (req as any).user?.id;
      const vacations = await VacationService.createRange(req.body, userId);
      res.status(201).json(vacations);
    } catch (error) {
      next(error);
    }
  }
);

// PUT /api/vacations/:id - Update vacation day
router.put('/:id',
  validateBody(updateVacationDaySchema),
  auditMiddleware('UPDATE_VACATION_DAY', 'vacation_day'),
  async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      const vacation = await VacationService.updateDay(id, req.body);
      res.json(vacation);
    } catch (error) {
      next(error);
    }
  }
);

// DELETE /api/vacations/:id - Delete vacation day
router.delete('/:id',
  auditMiddleware('DELETE_VACATION_DAY', 'vacation_day'),
  async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      const result = await VacationService.deleteDay(id);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

export default router;

