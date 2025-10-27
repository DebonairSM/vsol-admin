import { Router } from 'express';
import { PaymentService } from '../services/payment-service';
import { authenticateToken } from '../middleware/auth';
import { validateBody, validateQuery } from '../middleware/validate';
import { auditMiddleware } from '../middleware/audit';
import { createPaymentSchema } from '@vsol-admin/shared';
import { z } from 'zod';

const router = Router();

// All payment routes require authentication
router.use(authenticateToken);

const querySchema = z.object({
  cycleId: z.string().transform(Number).optional()
});

// GET /api/payments
router.get('/',
  validateQuery(querySchema),
  async (req, res, next) => {
    try {
      const { cycleId } = req.query as any;
      const payments = await PaymentService.getAll(cycleId);
      res.json(payments);
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/payments/:id
router.get('/:id', async (req, res, next) => {
  try {
    const payment = await PaymentService.getById(parseInt(req.params.id));
    res.json(payment);
  } catch (error) {
    next(error);
  }
});

// POST /api/payments
router.post('/',
  validateBody(createPaymentSchema),
  auditMiddleware('CREATE_PAYMENT', 'payment'),
  async (req, res, next) => {
    try {
      const payment = await PaymentService.create(req.body);
      res.status(201).json(payment);
    } catch (error) {
      next(error);
    }
  }
);

// DELETE /api/payments/:id
router.delete('/:id',
  auditMiddleware('DELETE_PAYMENT', 'payment'),
  async (req, res, next) => {
    try {
      const result = await PaymentService.delete(parseInt(req.params.id));
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

export default router;
