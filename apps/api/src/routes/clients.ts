import { Router } from 'express';
import { ClientService } from '../services/client-service';
import { authenticateToken } from '../middleware/auth';
import { validateBody } from '../middleware/validate';
import { auditMiddleware } from '../middleware/audit';
import { createClientSchema, updateClientSchema } from '@vsol-admin/shared';

const router: Router = Router();

// All client routes require authentication
router.use(authenticateToken);

// GET /api/clients
router.get('/', async (req, res, next) => {
  try {
    const clients = await ClientService.getAll();
    res.json(clients);
  } catch (error) {
    next(error);
  }
});

// GET /api/clients/:id
router.get('/:id', async (req, res, next) => {
  try {
    const client = await ClientService.getById(parseInt(req.params.id));
    res.json(client);
  } catch (error) {
    next(error);
  }
});

// POST /api/clients
router.post('/',
  validateBody(createClientSchema),
  auditMiddleware('CREATE_CLIENT', 'client'),
  async (req, res, next) => {
    try {
      const client = await ClientService.create(req.body);
      res.status(201).json(client);
    } catch (error) {
      next(error);
    }
  }
);

// PUT /api/clients/:id
router.put('/:id',
  validateBody(updateClientSchema),
  auditMiddleware('UPDATE_CLIENT', 'client'),
  async (req, res, next) => {
    try {
      const client = await ClientService.update(parseInt(req.params.id), req.body);
      res.json(client);
    } catch (error) {
      next(error);
    }
  }
);

// DELETE /api/clients/:id
router.delete('/:id',
  auditMiddleware('DELETE_CLIENT', 'client'),
  async (req, res, next) => {
    try {
      const result = await ClientService.delete(parseInt(req.params.id));
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

export default router;







