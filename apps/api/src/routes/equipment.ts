import { Router, Request, Response, NextFunction } from 'express';
import { EquipmentService } from '../services/equipment-service';
import { validateBody } from '../middleware/validate';
import { createEquipmentSchema, updateEquipmentSchema } from '@vsol-admin/shared';
import { auditMiddleware } from '../middleware/audit';
import { authenticateAdmin } from '../middleware/admin-auth';

const router: Router = Router();

// All equipment routes require admin authentication
router.use(authenticateAdmin);

// GET /equipment - List all equipment
router.get('/', async (req, res, next) => {
  try {
    const consultantId = req.query.consultantId ? Number(req.query.consultantId) : undefined;
    
    let equipment;
    if (consultantId) {
      equipment = await EquipmentService.getByConsultantId(consultantId);
    } else {
      // Get all equipment with consultant info
      const allEquipment = await EquipmentService.getAllWithConsultants();
      equipment = allEquipment;
    }

    res.json(equipment);
  } catch (error) {
    next(error);
  }
});

// GET /equipment/:id - Get specific equipment
router.get('/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const equipment = await EquipmentService.getById(id);
    res.json(equipment);
  } catch (error) {
    next(error);
  }
});

// POST /equipment - Create new equipment
router.post('/', 
  validateBody(createEquipmentSchema),
  auditMiddleware('CREATE_EQUIPMENT', 'EQUIPMENT'),
  async (req, res, next) => {
    try {
      const equipment = await EquipmentService.create(req.body);
      res.status(201).json(equipment);
    } catch (error) {
      next(error);
    }
  }
);

// PUT /equipment/:id - Update equipment
router.put('/:id',
  validateBody(updateEquipmentSchema),
  auditMiddleware('UPDATE_EQUIPMENT', 'EQUIPMENT'),
  async (req, res, next) => {
    try {
      const id = Number(req.params.id);
      const equipment = await EquipmentService.update(id, req.body);
      res.json(equipment);
    } catch (error) {
      next(error);
    }
  }
);

// DELETE /equipment/:id - Delete equipment
router.delete('/:id',
  auditMiddleware('DELETE_EQUIPMENT', 'EQUIPMENT'),
  async (req, res, next) => {
    try {
      const id = Number(req.params.id);
      await EquipmentService.delete(id);
      res.json({ success: true });
    } catch (error) {
      next(error);
    }
  }
);

// POST /equipment/:id/return - Mark equipment as returned
router.post('/:id/return',
  auditMiddleware('RETURN_EQUIPMENT', 'EQUIPMENT'),
  async (req, res, next) => {
    try {
      const id = Number(req.params.id);
      const returnedDate = req.body.returnedDate ? new Date(req.body.returnedDate) : undefined;
      const equipment = await EquipmentService.markAsReturned(id, returnedDate);
      res.json(equipment);
    } catch (error) {
      next(error);
    }
  }
);

// GET /equipment/pending-returns - Get equipment pending return
router.get('/pending-returns', async (req, res, next) => {
  try {
    const consultantId = req.query.consultantId ? Number(req.query.consultantId) : undefined;
    const pendingReturns = await EquipmentService.getPendingReturns(consultantId);
    res.json(pendingReturns);
  } catch (error) {
    next(error);
  }
});

export default router;
