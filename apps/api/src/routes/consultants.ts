import { Router } from 'express';
import { ConsultantService } from '../services/consultant-service';
import { EquipmentService } from '../services/equipment-service';
import { TerminationService } from '../services/termination-service';
import { DocumentService } from '../services/document-service';
import { ContractService } from '../services/contract-service';
import { authenticateToken } from '../middleware/auth';
import { validateBody } from '../middleware/validate';
import { auditMiddleware } from '../middleware/audit';
import { uploadConsultantDocument, validateFileContent } from '../middleware/upload';
import { ValidationError, NotFoundError } from '../middleware/errors';
import { 
  createConsultantSchema, 
  updateConsultantSchema,
  createEquipmentSchema,
  updateEquipmentSchema,
  initiateTerminationSchema,
  Consultant
} from '@vsol-admin/shared';

const router: Router = Router();

// All consultant routes require authentication
router.use(authenticateToken);

// GET /api/consultants
router.get('/', async (req, res, next) => {
  try {
    const consultants = await ConsultantService.getAll();
    res.json(consultants);
  } catch (error) {
    next(error);
  }
});

// GET /api/consultants/active
router.get('/active', async (req, res, next) => {
  try {
    const consultants = await ConsultantService.getActive();
    res.json(consultants);
  } catch (error) {
    next(error);
  }
});

// GET /api/consultants/:id/contract - Generate and download Master Services Agreement contract
// NOTE: This must come before /:id route to avoid route matching conflicts
router.get('/:id/contract',
  auditMiddleware('GENERATE_CONTRACT', 'consultant'),
  async (req, res, next) => {
    try {
      const consultantId = parseInt(req.params.id);
      
      // Get consultant data
      const consultant = await ConsultantService.getById(consultantId);
      
      // Generate contract text (service will validate required fields)
      // Note: Drizzle returns string literals for enum fields, but Consultant type expects enum
      const contractText = ContractService.generateContract(consultant as any);
      const filename = ContractService.generateContractFilename(consultant as any);
      
      // Set headers for text file download
      res.setHeader('Content-Type', 'text/plain');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Length', Buffer.byteLength(contractText, 'utf8'));
      
      // Send contract text
      res.send(contractText);
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/consultants/:id
router.get('/:id', async (req, res, next) => {
  try {
    const consultant = await ConsultantService.getById(parseInt(req.params.id));
    res.json(consultant);
  } catch (error) {
    next(error);
  }
});

// POST /api/consultants
router.post('/', 
  validateBody(createConsultantSchema),
  auditMiddleware('CREATE_CONSULTANT', 'consultant'),
  async (req, res, next) => {
    try {
      const consultant = await ConsultantService.create(req.body);
      res.status(201).json(consultant);
    } catch (error) {
      next(error);
    }
  }
);

// PUT /api/consultants/:id
router.put('/:id',
  validateBody(updateConsultantSchema),
  auditMiddleware('UPDATE_CONSULTANT', 'consultant'),
  async (req, res, next) => {
    try {
      const consultant = await ConsultantService.update(parseInt(req.params.id), req.body);
      res.json(consultant);
    } catch (error) {
      next(error);
    }
  }
);

// DELETE /api/consultants/:id
router.delete('/:id',
  auditMiddleware('DELETE_CONSULTANT', 'consultant'),
  async (req, res, next) => {
    try {
      const result = await ConsultantService.delete(parseInt(req.params.id));
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/consultants/:id/documents/:type - Upload document
router.post('/:id/documents/:type',
  uploadConsultantDocument.single('document'),
  auditMiddleware('UPLOAD_DOCUMENT', 'consultant'),
  async (req, res, next) => {
    try {
      const consultantId = parseInt(req.params.id);
      const documentType = req.params.type as 'cnh' | 'address_proof';
      
      if (!['cnh', 'address_proof'].includes(documentType)) {
        throw new ValidationError('Invalid document type. Must be "cnh" or "address_proof"');
      }

      if (!req.file) {
        throw new ValidationError('No file uploaded');
      }

      // SECURITY: Validate file content using magic bytes to prevent MIME type spoofing
      const validation = await validateFileContent(req.file.buffer, ['image/jpeg', 'image/png']);
      if (!validation.valid) {
        throw new ValidationError(validation.error || 'Invalid file type');
      }

      const consultant = await ConsultantService.uploadDocument(consultantId, documentType, req.file);
      res.json(consultant);
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/consultants/:id/documents/:type - Serve document file
router.get('/:id/documents/:type', async (req, res, next) => {
  try {
    const consultantId = parseInt(req.params.id);
    const documentType = req.params.type as 'cnh' | 'address_proof';
    
    if (!['cnh', 'address_proof'].includes(documentType)) {
      throw new ValidationError('Invalid document type');
    }

    const filePath = await ConsultantService.getDocumentPath(consultantId, documentType);
    
    if (!filePath) {
      throw new NotFoundError('Document not found');
    }

    // Set appropriate headers
    res.setHeader('Content-Type', 'image/jpeg'); // Default to JPEG, could be enhanced to detect actual type
    res.setHeader('Cache-Control', 'private, max-age=3600'); // 1 hour cache
    
    res.sendFile(filePath);
  } catch (error) {
    next(error);
  }
});

// Equipment Management Routes

// GET /api/consultants/:id/equipment - Get equipment for consultant
router.get('/:id/equipment', async (req, res, next) => {
  try {
    const consultantId = parseInt(req.params.id);
    const equipment = await EquipmentService.getByConsultantId(consultantId);
    res.json(equipment);
  } catch (error) {
    next(error);
  }
});

// POST /api/consultants/:id/equipment - Add equipment to consultant
router.post('/:id/equipment',
  validateBody(createEquipmentSchema),
  auditMiddleware('CREATE_EQUIPMENT', 'equipment'),
  async (req, res, next) => {
    try {
      const consultantId = parseInt(req.params.id);
      const equipmentData = { ...req.body, consultantId };
      const equipment = await EquipmentService.create(equipmentData);
      res.status(201).json(equipment);
    } catch (error) {
      next(error);
    }
  }
);

// PUT /api/consultants/:id/equipment/:equipmentId - Update equipment
router.put('/:id/equipment/:equipmentId',
  validateBody(updateEquipmentSchema),
  auditMiddleware('UPDATE_EQUIPMENT', 'equipment'),
  async (req, res, next) => {
    try {
      const equipmentId = parseInt(req.params.equipmentId);
      const equipment = await EquipmentService.update(equipmentId, req.body);
      res.json(equipment);
    } catch (error) {
      next(error);
    }
  }
);

// DELETE /api/consultants/:id/equipment/:equipmentId - Delete equipment
router.delete('/:id/equipment/:equipmentId',
  auditMiddleware('DELETE_EQUIPMENT', 'equipment'),
  async (req, res, next) => {
    try {
      const equipmentId = parseInt(req.params.equipmentId);
      const result = await EquipmentService.delete(equipmentId);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/consultants/:id/equipment/:equipmentId/return - Mark equipment as returned
router.post('/:id/equipment/:equipmentId/return',
  auditMiddleware('RETURN_EQUIPMENT', 'equipment'),
  async (req, res, next) => {
    try {
      const equipmentId = parseInt(req.params.equipmentId);
      const returnedDate = req.body.returnedDate ? new Date(req.body.returnedDate) : undefined;
      const equipment = await EquipmentService.markAsReturned(equipmentId, returnedDate);
      res.json(equipment);
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/consultants/:id/equipment/pending-returns - Get pending equipment returns
router.get('/:id/equipment/pending-returns', async (req, res, next) => {
  try {
    const consultantId = parseInt(req.params.id);
    const pendingReturns = await EquipmentService.getPendingReturns(consultantId);
    res.json(pendingReturns);
  } catch (error) {
    next(error);
  }
});

// Termination Management Routes

// GET /api/consultants/:id/termination/status - Get termination status
router.get('/:id/termination/status', async (req, res, next) => {
  try {
    const consultantId = parseInt(req.params.id);
    const status = await TerminationService.getTerminationStatus(consultantId);
    res.json(status);
  } catch (error) {
    next(error);
  }
});

// GET /api/consultants/:id/termination/document/check - Check whether termination document can be generated
router.get('/:id/termination/document/check', async (req, res, next) => {
  try {
    const consultantId = parseInt(req.params.id);

    // 1) High-level termination/equipment gating
    const { canGenerate: canGenerateByProcess, reasons } = await TerminationService.canGenerateDocument(consultantId);

    // 2) Data requirements gating (without generating the PDF)
    // Reuse the same validation as document generation, but capture missing fields.
    let missingFields: string[] = [];
    try {
      await TerminationService.validateTerminationData(consultantId);
    } catch (err: any) {
      const details = err?.details;
      if (details?.code === 'MISSING_TERMINATION_DOCUMENT_FIELDS' && Array.isArray(details?.missingFields)) {
        missingFields = details.missingFields;
      } else if (err?.message?.includes?.('Missing required fields for termination')) {
        // Fallback for unexpected shapes
        missingFields = [];
      } else if (err) {
        // If it's some other validation error (e.g., not terminated), surface through normal error handling
        throw err;
      }
    }

    const canGenerate = Boolean(canGenerateByProcess) && missingFields.length === 0;

    res.json({
      canGenerate,
      reasons: reasons && reasons.length > 0 ? reasons : undefined,
      missingFields: missingFields.length > 0 ? missingFields : undefined
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/consultants/:id/termination/initiate - Initiate termination
router.post('/:id/termination/initiate',
  validateBody(initiateTerminationSchema),
  auditMiddleware('INITIATE_TERMINATION', 'consultant'),
  async (req, res, next) => {
    try {
      const consultantId = parseInt(req.params.id);
      const terminationData = { ...req.body, consultantId };
      const consultant = await TerminationService.initiateTermination(terminationData);
      res.json(consultant);
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/consultants/:id/termination/sign-contract - Mark contract as signed
router.post('/:id/termination/sign-contract',
  auditMiddleware('SIGN_TERMINATION_CONTRACT', 'consultant'),
  async (req, res, next) => {
    try {
      const consultantId = parseInt(req.params.id);
      const contractSignedDate = req.body.contractSignedDate ? new Date(req.body.contractSignedDate) : undefined;
      const consultant = await TerminationService.signContract(consultantId, contractSignedDate);
      res.json(consultant);
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/consultants/:id/termination/document - Generate and download termination contract
router.get('/:id/termination/document',
  auditMiddleware('GENERATE_TERMINATION_DOCUMENT', 'consultant'),
  async (req, res, next) => {
    try {
      const consultantId = parseInt(req.params.id);
      
      // Get consultant data for filename
      const consultant = await ConsultantService.getById(consultantId);
      
      // Generate PDF document (service will validate if generation is possible)
      const pdfBuffer = await DocumentService.generateTerminationContract(consultantId);
      const filename = DocumentService.getTerminationDocumentFilename(consultant.name);
      
      // Set headers for PDF download
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Length', pdfBuffer.length);
      
      // Send PDF
      res.send(pdfBuffer);
    } catch (error) {
      next(error);
    }
  }
);

export default router;
