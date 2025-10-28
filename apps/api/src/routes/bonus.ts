import { Router } from 'express';
import { validateBody } from '../middleware/validate';
import { authenticateToken } from '../middleware/auth';
import { auditMiddleware } from '../middleware/audit';
import { updateBonusWorkflowSchema } from '@vsol-admin/shared';
import { BonusWorkflowService } from '../services/bonus-workflow-service';

const router: Router = Router();

// Get bonus workflow for a cycle
router.get('/cycles/:cycleId/bonus', authenticateToken, async (req, res, next) => {
  try {
    const cycleId = parseInt(req.params.cycleId);
    const workflow = await BonusWorkflowService.getByCycleId(cycleId);
    res.json(workflow);
  } catch (error) {
    next(error);
  }
});

// Create bonus workflow for a cycle
router.post('/cycles/:cycleId/bonus',
  authenticateToken,
  auditMiddleware('CREATE_BONUS_WORKFLOW', 'BONUS_WORKFLOW'),
  async (req, res, next) => {
    try {
      const cycleId = parseInt(req.params.cycleId);
      const workflow = await BonusWorkflowService.createForCycle(cycleId);
      res.status(201).json(workflow);
    } catch (error) {
      next(error);
    }
  }
);

// Update bonus workflow
router.patch('/cycles/:cycleId/bonus',
  authenticateToken,
  validateBody(updateBonusWorkflowSchema),
  auditMiddleware('UPDATE_BONUS_WORKFLOW', 'BONUS_WORKFLOW'),
  async (req, res, next) => {
    try {
      const cycleId = parseInt(req.params.cycleId);
      const workflow = await BonusWorkflowService.update(cycleId, req.body);
      res.json(workflow);
    } catch (error) {
      next(error);
    }
  }
);

// Generate bonus email content
router.post('/cycles/:cycleId/bonus/generate-email', authenticateToken, async (req, res, next) => {
  try {
    const cycleId = parseInt(req.params.cycleId);
    const result = await BonusWorkflowService.generateEmailContent(cycleId);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

export default router;

