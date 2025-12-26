import { Router } from 'express';
import { InvoiceLineItemService } from '../services/invoice-line-item-service';
import { authenticateToken } from '../middleware/auth';
import { validateBody } from '../middleware/validate';
import { auditMiddleware } from '../middleware/audit';
import { createInvoiceLineItemSchema, updateInvoiceLineItemSchema } from '@vsol-admin/shared';

const router: Router = Router();

// All invoice line item routes require authentication
router.use(authenticateToken);

// GET /api/invoice-line-items/invoice/:invoiceId
router.get('/invoice/:invoiceId', async (req, res, next) => {
  try {
    const lineItems = await InvoiceLineItemService.getByInvoiceId(parseInt(req.params.invoiceId));
    res.json(lineItems);
  } catch (error) {
    next(error);
  }
});

// POST /api/invoice-line-items
router.post('/',
  validateBody(createInvoiceLineItemSchema),
  auditMiddleware('CREATE_INVOICE_LINE_ITEM', 'invoice_line_item'),
  async (req, res, next) => {
    try {
      const lineItem = await InvoiceLineItemService.create(req.body);
      res.status(201).json(lineItem);
    } catch (error) {
      next(error);
    }
  }
);

// PUT /api/invoice-line-items/:id
router.put('/:id',
  validateBody(updateInvoiceLineItemSchema),
  auditMiddleware('UPDATE_INVOICE_LINE_ITEM', 'invoice_line_item'),
  async (req, res, next) => {
    try {
      const lineItem = await InvoiceLineItemService.update(parseInt(req.params.id), req.body);
      res.json(lineItem);
    } catch (error) {
      next(error);
    }
  }
);

// DELETE /api/invoice-line-items/:id
router.delete('/:id',
  auditMiddleware('DELETE_INVOICE_LINE_ITEM', 'invoice_line_item'),
  async (req, res, next) => {
    try {
      const result = await InvoiceLineItemService.delete(parseInt(req.params.id));
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

export default router;






