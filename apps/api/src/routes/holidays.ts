import { Router } from 'express';
import { authenticateToken } from '../middleware/auth';
import { HolidayService } from '../services/holiday-service';
import { validateBody } from '../middleware/validate';
import { updateHolidaySchema } from '@vsol-admin/shared';
import { auditMiddleware } from '../middleware/audit';

const router: Router = Router();

// All routes require authentication
router.use(authenticateToken);

// GET /api/holidays - Get holidays for year (defaults to current year)
router.get('/', async (req, res, next) => {
  try {
    const year = req.query.year 
      ? parseInt(req.query.year as string)
      : new Date().getFullYear();

    if (isNaN(year)) {
      return res.status(400).json({ error: 'Invalid year' });
    }

    const holidays = await HolidayService.getHolidaysForYear(year);
    res.json(holidays);
  } catch (error) {
    next(error);
  }
});

// POST /api/holidays/generate - Generate holidays for a year (idempotent)
router.post(
  '/generate',
  auditMiddleware('GENERATE_HOLIDAYS', 'holiday'),
  async (req, res, next) => {
    try {
      const year = req.query.year 
        ? parseInt(req.query.year as string)
        : new Date().getFullYear();

      if (isNaN(year)) {
        return res.status(400).json({ error: 'Invalid year' });
      }

      const holidays = await HolidayService.generateHolidaysForYear(year);
      res.json(holidays);
    } catch (error) {
      next(error);
    }
  }
);

// PUT /api/holidays/:id - Update holiday (e.g., override date)
router.put(
  '/:id',
  validateBody(updateHolidaySchema),
  auditMiddleware('UPDATE_HOLIDAY', 'holiday'),
  async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: 'Invalid holiday ID' });
      }

      const updateData: any = {};
      if (req.body.name !== undefined) updateData.name = req.body.name;
      if (req.body.date !== undefined) updateData.date = new Date(req.body.date);
      if (req.body.year !== undefined) updateData.year = req.body.year;
      if (req.body.isRecurring !== undefined) updateData.isRecurring = req.body.isRecurring;

      const holiday = await HolidayService.updateHoliday(id, updateData);
      res.json(holiday);
    } catch (error) {
      next(error);
    }
  }
);

export default router;

