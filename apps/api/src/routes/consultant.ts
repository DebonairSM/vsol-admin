import { Router } from 'express';
import { authenticateOwnConsultant } from '../middleware/consultant-auth';
import { ConsultantInvoiceService } from '../services/consultant-invoice-service';
import { ConsultantService } from '../services/consultant-service';
import { EquipmentService } from '../services/equipment-service';
import { uploadInvoice } from '../middleware/upload';
import { validateFileContent } from '../middleware/upload';
import { ValidationError } from '../middleware/errors';
import { validateBody } from '../middleware/validate';
import { z } from 'zod';
import { updateEquipmentSchema, createConsultantEquipmentSchema, updateConsultantProfileSchema } from '@vsol-admin/shared';
import { auditMiddleware } from '../middleware/audit';

const router: Router = Router();

// All routes require consultant authentication and own data access
// This middleware already sets consultantId on req
router.use(authenticateOwnConsultant);

// GET /api/consultant/cycles - Get cycles available for invoice upload
router.get('/cycles', async (req, res, next) => {
  try {
    const cycles = await ConsultantInvoiceService.getAvailableCycles();
    res.json(cycles);
  } catch (error) {
    next(error);
  }
});

// POST /api/consultant/invoices - Upload invoice file for a cycle
router.post('/invoices',
  uploadInvoice.single('file'),
  async (req, res, next) => {
    try {
      const consultantId = (req as any).consultantId;
      const userId = req.user!.userId;
      const cycleId = parseInt(req.body.cycleId);

      if (!cycleId || isNaN(cycleId)) {
        throw new ValidationError('Cycle ID is required and must be a valid number');
      }

      if (!req.file) {
        throw new ValidationError('No file uploaded');
      }

      // Validate file content using magic bytes
      const allowedMimeTypes = ['image/jpeg', 'image/png', 'application/pdf'];
      const validation = await validateFileContent(req.file.buffer, allowedMimeTypes);
      if (!validation.valid) {
        throw new ValidationError(validation.error || 'Invalid file type');
      }

      const invoice = await ConsultantInvoiceService.uploadInvoice(
        consultantId,
        cycleId,
        userId,
        req.file
      );

      res.json(invoice);
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/consultant/invoices - Get all invoices for consultant
// NOTE: This must come before /invoices/:cycleId to avoid route matching conflicts
router.get('/invoices', async (req, res, next) => {
  try {
    const consultantId = (req as any).consultantId;
    
    if (!consultantId) {
      return res.status(400).json({ error: 'Consultant ID is required' });
    }

    const invoices = await ConsultantInvoiceService.getAllInvoices(consultantId);
    res.json(invoices);
  } catch (error) {
    next(error);
  }
});

// GET /api/consultant/invoices/:cycleId - Get uploaded invoice for a cycle
router.get('/invoices/:cycleId', async (req, res, next) => {
  try {
    const consultantId = (req as any).consultantId;
    const cycleId = parseInt(req.params.cycleId);

    const invoice = await ConsultantInvoiceService.getInvoice(consultantId, cycleId);
    
    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    res.json(invoice);
  } catch (error) {
    next(error);
  }
});

// GET /api/consultant/invoices/:cycleId/download - Download invoice file
router.get('/invoices/:cycleId/download', async (req, res, next) => {
  try {
    const consultantId = (req as any).consultantId;
    const cycleId = parseInt(req.params.cycleId);

    const invoice = await ConsultantInvoiceService.getInvoice(consultantId, cycleId);
    
    if (!invoice || !invoice.filePath) {
      return res.status(404).json({ error: 'Invoice file not found' });
    }

    const filePath = await ConsultantInvoiceService.getInvoiceFilePath(consultantId, cycleId);
    
    if (!filePath) {
      return res.status(404).json({ error: 'Invoice file not found' });
    }

    // Determine content type based on file extension
    const ext = invoice.filePath.split('.').pop()?.toLowerCase();
    let contentType = 'application/octet-stream';
    if (ext === 'pdf') {
      contentType = 'application/pdf';
    } else if (['jpg', 'jpeg'].includes(ext || '')) {
      contentType = 'image/jpeg';
    } else if (ext === 'png') {
      contentType = 'image/png';
    }

    // Set headers for file download
    const fileName = invoice.fileName || `invoice-${cycleId}.${ext || 'pdf'}`;
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.setHeader('Cache-Control', 'private, max-age=3600'); // 1 hour cache
    
    res.sendFile(filePath);
  } catch (error) {
    next(error);
  }
});

// GET /api/consultant/profile - Get consultant's own profile data
router.get('/profile', async (req, res, next) => {
  try {
    const consultantId = (req as any).consultantId;
    const consultant = await ConsultantService.getById(consultantId);
    // Sanitize to remove company-private fields (hourlyRate, evaluationNotes, etc.)
    const sanitized = ConsultantService.sanitizeForConsultant(consultant);
    res.json(sanitized);
  } catch (error) {
    next(error);
  }
});

// PUT /api/consultant/profile - Update consultant's own profile (personal data only)
router.put('/profile', validateBody(updateConsultantProfileSchema), async (req, res, next) => {
  try {
    const consultantId = (req as any).consultantId;
    // Update only accepts personal data fields (validated by schema)
    const consultant = await ConsultantService.update(consultantId, req.body);
    // Sanitize response to ensure no company-private data is returned
    const sanitized = ConsultantService.sanitizeForConsultant(consultant);
    res.json(sanitized);
  } catch (error) {
    next(error);
  }
});

// GET /api/consultant/equipment - Get consultant's equipment list
router.get('/equipment', async (req, res, next) => {
  try {
    const consultantId = (req as any).consultantId;
    const equipment = await EquipmentService.getByConsultantId(consultantId);
    res.json(equipment);
  } catch (error) {
    next(error);
  }
});

// POST /api/consultant/equipment - Create new equipment for consultant
router.post(
  '/equipment',
  validateBody(createConsultantEquipmentSchema),
  auditMiddleware('CREATE_EQUIPMENT', 'equipment'),
  async (req, res, next) => {
    try {
      const consultantId = (req as any).consultantId;
      const equipmentData = { ...req.body, consultantId };
      const equipment = await EquipmentService.create(equipmentData);
      res.status(201).json(equipment);
    } catch (error) {
      next(error);
    }
  }
);

// PUT /api/consultant/equipment/:id - Update equipment information
router.put('/equipment/:id', validateBody(updateEquipmentSchema), async (req, res, next) => {
  try {
    const consultantId = (req as any).consultantId;
    const equipmentId = parseInt(req.params.id);

    // Verify equipment belongs to consultant
    const equipment = await EquipmentService.getById(equipmentId);
    if (equipment.consultantId !== consultantId) {
      throw new ValidationError('You can only update your own equipment');
    }

    const updated = await EquipmentService.update(equipmentId, req.body);
    res.json(updated);
  } catch (error) {
    next(error);
  }
});

export default router;

