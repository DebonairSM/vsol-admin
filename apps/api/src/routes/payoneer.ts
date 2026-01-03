import { Router, type Request, type Response } from 'express';
import { PayoneerService } from '../services/payoneer-service';
import { authenticateAdmin } from '../middleware/admin-auth';

const router: Router = Router();

// All Payoneer routes require admin authentication
router.use(authenticateAdmin);

/**
 * GET /api/payoneer/test
 * Test Payoneer API connection with current credentials
 */
router.get('/test', async (req, res, next) => {
  try {
    const result = await PayoneerService.testConnection();
    
    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error: any) {
    next(error);
  }
});

/**
 * GET /api/payoneer/payees
 * Fetch all payees from Payoneer Mass Payouts API
 */
router.get('/payees', async (req, res, next) => {
  try {
    const payees = await PayoneerService.getPayees();
    res.json({
      success: true,
      count: payees.length,
      payees
    });
  } catch (error: any) {
    next(error);
  }
});

/**
 * GET /api/payoneer/payees/:payeeId
 * Get a specific payee by ID
 */
router.get('/payees/:payeeId', async (req, res, next) => {
  try {
    const { payeeId } = req.params;
    const payee = await PayoneerService.getPayee(payeeId);
    res.json({
      success: true,
      payee
    });
  } catch (error: any) {
    next(error);
  }
});

export default router;

