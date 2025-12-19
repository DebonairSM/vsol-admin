import { Router } from 'express';
import { authenticateOwnConsultant } from '../middleware/consultant-auth';
import { ConsultantInvoiceService } from '../services/consultant-invoice-service';
import { ConsultantService } from '../services/consultant-service';
import { EquipmentService } from '../services/equipment-service';
import { VacationService } from '../services/vacation-service';
import { SprintCeremonyService } from '../services/sprint-ceremony-service';
import { HolidayService } from '../services/holiday-service';
import { uploadInvoice } from '../middleware/upload';
import { validateFileContent } from '../middleware/upload';
import { ValidationError, ForbiddenError } from '../middleware/errors';
import { validateBody } from '../middleware/validate';
import { z } from 'zod';
import { updateEquipmentSchema, createConsultantEquipmentSchema, updateConsultantProfileSchema, createConsultantVacationDaySchema, createConsultantVacationRangeSchema, updateVacationDaySchema } from '@vsol-admin/shared';
import { auditMiddleware } from '../middleware/audit';
import { eq } from 'drizzle-orm';
import { db, vacationDays } from '../db';

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

// Vacation routes for consultants

// GET /api/consultant/vacations - Get consultant's own vacations
router.get('/vacations', async (req, res, next) => {
  try {
    const consultantId = (req as any).consultantId;
    const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
    const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;
    
    const vacations = await VacationService.getByConsultantId(consultantId, startDate, endDate);
    res.json(vacations);
  } catch (error) {
    next(error);
  }
});

// GET /api/consultant/vacations/balance - Get consultant's own vacation balance
router.get('/vacations/balance', async (req, res, next) => {
  try {
    const consultantId = (req as any).consultantId;
    const referenceDate = req.query.referenceDate ? new Date(req.query.referenceDate as string) : new Date();
    
    const balance = await VacationService.getBalance(consultantId, referenceDate);
    res.json(balance);
  } catch (error) {
    next(error);
  }
});

// GET /api/consultant/vacations/calendar - Get consultant's own vacations for calendar view
router.get('/vacations/calendar', async (req, res, next) => {
  try {
    if (!req.query.startDate || !req.query.endDate) {
      throw new ValidationError('startDate and endDate query parameters are required');
    }
    
    const consultantId = (req as any).consultantId;
    const startDate = new Date(req.query.startDate as string);
    const endDate = new Date(req.query.endDate as string);
    
    const vacations = await VacationService.getByConsultantId(consultantId, startDate, endDate);
    const events = vacations.map(v => ({
      date: v.vacationDate.toISOString().split('T')[0],
      consultantId: v.consultantId,
      consultantName: 'Me',
      notes: v.notes
    }));
    
    res.json(events);
  } catch (error) {
    next(error);
  }
});

// POST /api/consultant/vacations - Create single vacation day (automatically uses consultant's ID)
router.post('/vacations',
  validateBody(createConsultantVacationDaySchema),
  auditMiddleware('CREATE_VACATION_DAY', 'vacation_day'),
  async (req, res, next) => {
    try {
      const consultantId = (req as any).consultantId;
      const userId = req.user!.userId;
      
      // Add consultantId to the request body (schema doesn't include it)
      const vacationData = {
        ...req.body,
        consultantId
      };
      
      const vacation = await VacationService.createDay(vacationData, userId);
      res.status(201).json(vacation);
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/consultant/vacations/range - Create vacation range (automatically uses consultant's ID)
router.post('/vacations/range',
  validateBody(createConsultantVacationRangeSchema),
  auditMiddleware('CREATE_VACATION_RANGE', 'vacation_day'),
  async (req, res, next) => {
    try {
      const consultantId = (req as any).consultantId;
      const userId = req.user!.userId;
      
      // Add consultantId to the request body (schema doesn't include it)
      const rangeData = {
        ...req.body,
        consultantId
      };
      
      const vacations = await VacationService.createRange(rangeData, userId);
      res.status(201).json(vacations);
    } catch (error) {
      next(error);
    }
  }
);

// PUT /api/consultant/vacations/:id - Update vacation day (only if it belongs to consultant)
router.put('/vacations/:id',
  validateBody(updateVacationDaySchema),
  auditMiddleware('UPDATE_VACATION_DAY', 'vacation_day'),
  async (req, res, next) => {
    try {
      const consultantId = (req as any).consultantId;
      const id = parseInt(req.params.id);
      
      // Verify vacation belongs to consultant
      const vacation = await db.query.vacationDays.findFirst({
        where: eq(vacationDays.id, id)
      });
      
      if (!vacation || vacation.consultantId !== consultantId) {
        throw new ForbiddenError('You can only update your own vacations');
      }
      
      const updated = await VacationService.updateDay(id, req.body);
      res.json(updated);
    } catch (error) {
      next(error);
    }
  }
);

// DELETE /api/consultant/vacations/:id - Delete vacation day (only if it belongs to consultant)
router.delete('/vacations/:id',
  auditMiddleware('DELETE_VACATION_DAY', 'vacation_day'),
  auditMiddleware('DELETE_VACATION_DAY', 'vacation_day'),
  async (req, res, next) => {
    try {
      const consultantId = (req as any).consultantId;
      const id = parseInt(req.params.id);
      
      // Verify vacation belongs to consultant
      const vacation = await db.query.vacationDays.findFirst({
        where: eq(vacationDays.id, id)
      });
      
      if (!vacation || vacation.consultantId !== consultantId) {
        throw new ForbiddenError('You can only delete your own vacations');
      }
      
      const result = await VacationService.deleteDay(id);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

// Ceremony routes for consultants (read-only)

// GET /api/consultant/ceremonies - Get ceremonies for consultant calendar view (read-only)
router.get('/ceremonies', async (req, res, next) => {
  try {
    const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
    const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;

    if (!startDate || !endDate) {
      return res.status(400).json({ error: 'startDate and endDate query parameters are required' });
    }

    const ceremonies = await SprintCeremonyService.getCeremoniesForDateRange(startDate, endDate);
    res.json(ceremonies);
  } catch (error) {
    next(error);
  }
});

// GET /api/consultant/ceremonies/occurrences - Get expanded ceremony occurrences for consultant calendar view (read-only)
router.get('/ceremonies/occurrences', async (req, res, next) => {
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

// Holiday routes for consultants (read-only)

// GET /api/consultant/holidays - Get holidays for consultant calendar view (read-only)
router.get('/holidays', async (req, res, next) => {
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

export default router;

