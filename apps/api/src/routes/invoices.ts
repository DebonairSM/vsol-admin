import { Router } from 'express';
import { InvoiceService } from '../services/invoice-service';
import { authenticateToken } from '../middleware/auth';
import { validateBody, validateQuery } from '../middleware/validate';
import { auditMiddleware } from '../middleware/audit';
import { createInvoiceSchema, updateInvoiceSchema } from '@vsol-admin/shared';
import { z } from 'zod';

const router = Router();

// All invoice routes require authentication
router.use(authenticateToken);

const querySchema = z.object({
  cycleId: z.string().transform(Number).optional()
});

// GET /api/invoices
router.get('/', 
  validateQuery(querySchema),
  async (req, res, next) => {
    try {
      const { cycleId } = req.query as any;
      const invoices = await InvoiceService.getAll(cycleId);
      res.json(invoices);
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/invoices/:id
router.get('/:id', async (req, res, next) => {
  try {
    const invoice = await InvoiceService.getById(parseInt(req.params.id));
    res.json(invoice);
  } catch (error) {
    next(error);
  }
});

// POST /api/invoices
router.post('/',
  validateBody(createInvoiceSchema),
  auditMiddleware('CREATE_INVOICE', 'invoice'),
  async (req, res, next) => {
    try {
      const invoice = await InvoiceService.create(req.body);
      res.status(201).json(invoice);
    } catch (error) {
      next(error);
    }
  }
);

// PUT /api/invoices/:id
router.put('/:id',
  validateBody(updateInvoiceSchema),
  auditMiddleware('UPDATE_INVOICE', 'invoice'),
  async (req, res, next) => {
    try {
      const invoice = await InvoiceService.update(parseInt(req.params.id), req.body);
      res.json(invoice);
    } catch (error) {
      next(error);
    }
  }
);

// DELETE /api/invoices/:id
router.delete('/:id',
  auditMiddleware('DELETE_INVOICE', 'invoice'),
  async (req, res, next) => {
    try {
      const result = await InvoiceService.delete(parseInt(req.params.id));
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

export default router;
