import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { ConsultantService } from '../services/consultant-service';
import { ContractService } from '../services/contract-service';
import { authenticateToken } from '../middleware/auth';
import { validateBody } from '../middleware/validate';
import { auditMiddleware } from '../middleware/audit';
import { createConsultantSchema, updateConsultantSchema } from '@vsol-admin/shared';

const router = Router();

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png'];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only JPEG and PNG files are allowed'));
    }
  },
});

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
  upload.single('document'),
  auditMiddleware('UPLOAD_DOCUMENT', 'consultant'),
  async (req, res, next) => {
    try {
      const consultantId = parseInt(req.params.id);
      const documentType = req.params.type as 'cnh' | 'address_proof';
      
      if (!['cnh', 'address_proof'].includes(documentType)) {
        return res.status(400).json({ error: 'Invalid document type. Must be "cnh" or "address_proof"' });
      }

      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
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
      return res.status(400).json({ error: 'Invalid document type' });
    }

    const filePath = await ConsultantService.getDocumentPath(consultantId, documentType);
    
    if (!filePath) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // Set appropriate headers
    res.setHeader('Content-Type', 'image/jpeg'); // Default to JPEG, could be enhanced to detect actual type
    res.setHeader('Cache-Control', 'private, max-age=3600'); // 1 hour cache
    
    res.sendFile(filePath);
  } catch (error) {
    next(error);
  }
});

// GET /api/consultants/:id/contract - Generate and download contract
router.get('/:id/contract',
  auditMiddleware('GENERATE_CONTRACT', 'consultant'),
  async (req, res, next) => {
    try {
      const consultantId = parseInt(req.params.id);
      
      // Get consultant data
      const consultant = await ConsultantService.getById(consultantId);
      
      // Validate consultant has required fields
      const validationError = ContractService.validateConsultantForContract(consultant);
      if (validationError) {
        return res.status(400).json({ 
          error: validationError.message,
          missingFields: validationError.missingFields 
        });
      }
      
      // Generate contract content
      const contractContent = ContractService.generateContract(consultant);
      const filename = ContractService.generateContractFilename(consultant);
      
      // Set headers for file download
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Length', Buffer.byteLength(contractContent, 'utf8'));
      
      // Send contract content
      res.send(contractContent);
    } catch (error) {
      next(error);
    }
  }
);

export default router;
