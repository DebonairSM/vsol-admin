import { Router } from 'express';
import { CompanyService } from '../services/company-service';
import { authenticateToken } from '../middleware/auth';
import { validateBody } from '../middleware/validate';
import { auditMiddleware } from '../middleware/audit';
import { updateCompanySchema } from '@vsol-admin/shared';

const router: Router = Router();

// All company routes require authentication
router.use(authenticateToken);

// GET /api/companies
router.get('/', async (req, res, next) => {
  try {
    const company = await CompanyService.getCompany();
    res.json(company);
  } catch (error) {
    next(error);
  }
});

// PUT /api/companies
router.put('/',
  validateBody(updateCompanySchema),
  auditMiddleware('UPDATE_COMPANY', 'company'),
  async (req, res, next) => {
    try {
      const company = await CompanyService.updateCompany(req.body);
      res.json(company);
    } catch (error) {
      next(error);
    }
  }
);

export default router;

