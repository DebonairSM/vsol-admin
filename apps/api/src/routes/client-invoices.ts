import { Router } from 'express';
import { ClientInvoiceService } from '../services/client-invoice-service';
import { EmailService } from '../services/email-service';
import { PDFService } from '../services/pdf-service';
import { authenticateToken } from '../middleware/auth';
import { validateBody, validateQuery } from '../middleware/validate';
import { auditMiddleware } from '../middleware/audit';
import { createClientInvoiceSchema, updateClientInvoiceSchema, updateClientInvoiceStatusSchema } from '@vsol-admin/shared';
import { z } from 'zod';

const router: Router = Router();

// All invoice routes require authentication
router.use(authenticateToken);

const querySchema = z.object({
  cycleId: z.string().transform(Number).optional(),
  status: z.enum(['DRAFT', 'SENT', 'APPROVED', 'OVERDUE', 'PAID', 'CANCELLED']).optional()
});

// GET /api/client-invoices
router.get('/',
  validateQuery(querySchema),
  async (req, res, next) => {
    try {
      const { cycleId, status } = req.query as any;
      const invoices = await ClientInvoiceService.getAll(cycleId, status);
      res.json(invoices);
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/client-invoices/:id
router.get('/:id', async (req, res, next) => {
  try {
    const invoice = await ClientInvoiceService.getById(parseInt(req.params.id));
    res.json(invoice);
  } catch (error) {
    next(error);
  }
});

// GET /api/client-invoices/cycle/:cycleId
router.get('/cycle/:cycleId', async (req, res, next) => {
  try {
    const cycleId = parseInt(req.params.cycleId);
    if (isNaN(cycleId)) {
      return res.status(400).json({ error: 'Invalid cycle ID' });
    }
    const invoice = await ClientInvoiceService.getByCycleId(cycleId);
    res.json(invoice);
  } catch (error) {
    next(error);
  }
});

// POST /api/client-invoices
router.post('/',
  validateBody(createClientInvoiceSchema),
  auditMiddleware('CREATE_CLIENT_INVOICE', 'client_invoice'),
  async (req, res, next) => {
    try {
      const invoice = await ClientInvoiceService.create(req.body);
      res.status(201).json(invoice);
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/client-invoices/from-cycle/:cycleId
router.post('/from-cycle/:cycleId',
  auditMiddleware('CREATE_CLIENT_INVOICE_FROM_CYCLE', 'client_invoice'),
  async (req, res, next) => {
    try {
      const invoice = await ClientInvoiceService.createFromCycle(parseInt(req.params.cycleId));
      res.status(201).json(invoice);
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/client-invoices/from-cycle/:cycleId/check
router.get('/from-cycle/:cycleId/check', async (req, res, next) => {
  try {
    const cycleId = parseInt(req.params.cycleId);
    if (isNaN(cycleId)) {
      return res.status(400).json({ error: 'Invalid cycle ID' });
    }

    const result = await ClientInvoiceService.getCreateFromCycleEligibility(cycleId);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// PUT /api/client-invoices/:id
router.put('/:id',
  validateBody(updateClientInvoiceSchema),
  auditMiddleware('UPDATE_CLIENT_INVOICE', 'client_invoice'),
  async (req, res, next) => {
    try {
      const invoice = await ClientInvoiceService.update(parseInt(req.params.id), req.body);
      res.json(invoice);
    } catch (error) {
      next(error);
    }
  }
);

// PUT /api/client-invoices/:id/status
router.put('/:id/status',
  validateBody(updateClientInvoiceStatusSchema),
  auditMiddleware('UPDATE_CLIENT_INVOICE_STATUS', 'client_invoice'),
  async (req, res, next) => {
    try {
      const invoiceId = parseInt(req.params.id);

      // If marking SENT, send the invoice email first; only mark SENT if sending succeeds.
      if (req.body?.status === 'SENT') {
        await EmailService.sendClientInvoiceEmail({ clientInvoiceId: invoiceId });
      }

      const invoice = await ClientInvoiceService.updateStatus(invoiceId, req.body);
      res.json(invoice);
    } catch (error) {
      next(error);
    }
  }
);

// DELETE /api/client-invoices/:id
router.delete('/:id',
  auditMiddleware('DELETE_CLIENT_INVOICE', 'client_invoice'),
  async (req, res, next) => {
    try {
      const result = await ClientInvoiceService.delete(parseInt(req.params.id));
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/client-invoices/:id/pdf
router.get('/:id/pdf', async (req, res, next) => {
  try {
    const invoiceId = parseInt(req.params.id);
    if (isNaN(invoiceId)) {
      return res.status(400).json({ error: 'Invalid invoice ID' });
    }

    const invoice = await ClientInvoiceService.getById(invoiceId);
    const pdfBuffer = await PDFService.generateInvoicePDF(invoiceId);
    const fileName = `invoice-${invoice.invoiceNumber}.pdf`;

    // Check if this is a preview request (inline) or download (attachment)
    const isPreview = req.query.preview === 'true';
    const disposition = isPreview ? 'inline' : 'attachment';

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `${disposition}; filename="${fileName}"`);
    res.send(pdfBuffer);
  } catch (error) {
    next(error);
  }
});

export default router;

