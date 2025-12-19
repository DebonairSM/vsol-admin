import { Router } from 'express';
import { authenticateToken } from '../middleware/auth';
import { validateBody } from '../middleware/validate';
import { SprintCeremonyService } from '../services/sprint-ceremony-service';
import { createSprintCeremonySchema, updateSprintCeremonySchema } from '@vsol-admin/shared';
import { auditMiddleware } from '../middleware/audit';

const router: Router = Router();

// All routes require authentication
router.use(authenticateToken);

// GET /api/sprint-ceremonies - List ceremonies with optional date range filter
router.get('/', async (req, res, next) => {
  try {
    const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
    const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;

    if (startDate && endDate) {
      const ceremonies = await SprintCeremonyService.getCeremoniesForDateRange(startDate, endDate);
      res.json(ceremonies);
    } else {
      // If no date range, return all ceremonies (could be limited in future)
      const now = new Date();
      const future = new Date(now.getTime() + (365 * 24 * 60 * 60 * 1000)); // 1 year ahead
      const ceremonies = await SprintCeremonyService.getCeremoniesForDateRange(now, future);
      res.json(ceremonies);
    }
  } catch (error) {
    next(error);
  }
});

// GET /api/sprint-ceremonies/occurrences - Get expanded occurrences for date range
router.get('/occurrences', async (req, res, next) => {
  try {
    const startDateStr = req.query.startDate as string;
    const endDateStr = req.query.endDate as string;

    if (!startDateStr || !endDateStr) {
      return res.status(400).json({ error: 'startDate and endDate query parameters are required' });
    }

    const startDate = new Date(startDateStr);
    const endDate = new Date(endDateStr);

    const occurrences = await SprintCeremonyService.expandRecurringOccurrences(startDate, endDate);
    res.json(occurrences);
  } catch (error) {
    next(error);
  }
});

// GET /api/sprint-ceremonies/:id - Get single ceremony
router.get('/:id', async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid ceremony ID' });
    }

    const ceremony = await SprintCeremonyService.getCeremonyById(id);
    res.json(ceremony);
  } catch (error) {
    next(error);
  }
});

// POST /api/sprint-ceremonies - Create ceremony
router.post(
  '/',
  validateBody(createSprintCeremonySchema),
  auditMiddleware('CREATE_CEREMONY', 'sprint_ceremony'),
  async (req, res, next) => {
    try {
      const userId = req.user!.userId;
      const ceremony = await SprintCeremonyService.createCeremony(req.body, userId);
      res.status(201).json(ceremony);
    } catch (error) {
      next(error);
    }
  }
);

// PUT /api/sprint-ceremonies/:id - Update ceremony
router.put(
  '/:id',
  validateBody(updateSprintCeremonySchema),
  auditMiddleware('UPDATE_CEREMONY', 'sprint_ceremony'),
  async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: 'Invalid ceremony ID' });
      }

      const userId = req.user!.userId;
      const ceremony = await SprintCeremonyService.updateCeremony(id, req.body, userId);
      res.json(ceremony);
    } catch (error) {
      next(error);
    }
  }
);

// DELETE /api/sprint-ceremonies/:id - Delete ceremony
router.delete(
  '/:id',
  auditMiddleware('DELETE_CEREMONY', 'sprint_ceremony'),
  async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: 'Invalid ceremony ID' });
      }

      await SprintCeremonyService.deleteCeremony(id);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
);

export default router;

