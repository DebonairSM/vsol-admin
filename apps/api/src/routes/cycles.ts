import { Router } from 'express';
import { CycleService } from '../services/cycle-service';
import { LineItemService } from '../services/line-item-service';
import { authenticateToken } from '../middleware/auth';
import { validateBody } from '../middleware/validate';
import { auditMiddleware } from '../middleware/audit';
import { createCycleSchema, updateCycleSchema, updateLineItemSchema, calculatePaymentSchema } from '@vsol-admin/shared';

const router = Router();

// All cycle routes require authentication
router.use(authenticateToken);

// GET /api/cycles
router.get('/', async (req, res, next) => {
  try {
    const cycles = await CycleService.getAll();
    res.json(cycles);
  } catch (error) {
    next(error);
  }
});

// GET /api/cycles/:id
router.get('/:id', async (req, res, next) => {
  try {
    const cycle = await CycleService.getById(parseInt(req.params.id));
    res.json(cycle);
  } catch (error) {
    next(error);
  }
});

// GET /api/cycles/:id/summary
router.get('/:id/summary', async (req, res, next) => {
  try {
    const summary = await CycleService.getSummary(parseInt(req.params.id));
    res.json(summary);
  } catch (error) {
    next(error);
  }
});

// GET /api/cycles/:id/lines
router.get('/:id/lines', async (req, res, next) => {
  try {
    const lines = await LineItemService.getByCycle(parseInt(req.params.id));
    res.json(lines);
  } catch (error) {
    next(error);
  }
});

// POST /api/cycles/:id/calculate-payment
router.post('/:id/calculate-payment',
  auditMiddleware('CALCULATE_PAYMENT', 'cycle'),
  async (req, res, next) => {
    try {
      const paymentCalculation = await CycleService.calculatePayment(parseInt(req.params.id));
      res.json(paymentCalculation);
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/cycles
router.post('/',
  validateBody(createCycleSchema),
  auditMiddleware('CREATE_CYCLE', 'cycle'),
  async (req, res, next) => {
    try {
      const cycle = await CycleService.create(req.body);
      res.status(201).json(cycle);
    } catch (error) {
      next(error);
    }
  }
);

// PUT /api/cycles/:id
router.put('/:id',
  validateBody(updateCycleSchema),
  auditMiddleware('UPDATE_CYCLE', 'cycle'),
  async (req, res, next) => {
    try {
      const cycle = await CycleService.update(parseInt(req.params.id), req.body);
      res.json(cycle);
    } catch (error) {
      next(error);
    }
  }
);

// PUT /api/cycles/:cycleId/lines/:lineId
router.put('/:cycleId/lines/:lineId',
  validateBody(updateLineItemSchema),
  auditMiddleware('UPDATE_LINE_ITEM', 'lineItem'),
  async (req, res, next) => {
    try {
      const lineItem = await LineItemService.update(parseInt(req.params.lineId), req.body);
      res.json(lineItem);
    } catch (error) {
      next(error);
    }
  }
);

export default router;
