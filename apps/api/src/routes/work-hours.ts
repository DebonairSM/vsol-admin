import { Router } from 'express';
import { WorkHoursService } from '../services/work-hours-service';
import { authenticateToken } from '../middleware/auth';
import { validateBody } from '../middleware/validate';
import { auditMiddleware } from '../middleware/audit';
import { importWorkHoursSchema } from '@vsol-admin/shared';

const router: Router = Router();

// All work hours routes require authentication
router.use(authenticateToken);

// GET /api/work-hours
router.get('/', async (req, res, next) => {
  try {
    const workHours = await WorkHoursService.getAll();
    res.json(workHours);
  } catch (error) {
    next(error);
  }
});

// GET /api/work-hours/:year
router.get('/:year', async (req, res, next) => {
  try {
    const year = parseInt(req.params.year);
    const workHours = await WorkHoursService.getByYear(year);
    res.json(workHours);
  } catch (error) {
    next(error);
  }
});

// GET /api/work-hours/suggestion/:monthLabel
router.get('/suggestion/:monthLabel', async (req, res, next) => {
  try {
    const monthLabel = decodeURIComponent(req.params.monthLabel);
    const suggestedHours = await WorkHoursService.getSuggestedHours(monthLabel);
    res.json({ suggestedHours });
  } catch (error) {
    next(error);
  }
});

// POST /api/work-hours/import
router.post('/import',
  validateBody(importWorkHoursSchema),
  auditMiddleware('IMPORT_WORK_HOURS', 'workHours'),
  async (req, res, next) => {
    try {
      const { jsonContent } = req.body;
      
      // Parse JSON content
      const parsedData = await WorkHoursService.parseJSON(jsonContent);
      
      let totalImported = 0;
      let totalUpdated = 0;
      const errors: string[] = [];

      // Import each year's data
      for (const yearData of parsedData) {
        try {
          const result = await WorkHoursService.importWorkHours(yearData);
          totalImported += result.imported;
          totalUpdated += result.updated;
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          errors.push(`Year ${yearData.year}: ${message}`);
        }
      }

      res.json({
        success: true,
        imported: totalImported,
        updated: totalUpdated,
        yearsProcessed: parsedData.length,
        errors: errors.length > 0 ? errors : undefined
      });
    } catch (error) {
      next(error);
    }
  }
);

// DELETE /api/work-hours/:year
router.delete('/:year',
  auditMiddleware('DELETE_WORK_HOURS_YEAR', 'workHours'),
  async (req, res, next) => {
    try {
      const year = parseInt(req.params.year);
      const deletedCount = await WorkHoursService.deleteYear(year);
      res.json({ 
        success: true, 
        deleted: deletedCount,
        message: `Deleted ${deletedCount} work hours records for ${year}`
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
