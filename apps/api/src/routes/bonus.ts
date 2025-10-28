import { Router } from 'express';
import { validateBody } from '../middleware/validate';
import { authenticateToken } from '../middleware/auth';
import { updateBonusWorkflowSchema } from '@vsol-admin/shared';
import { BonusWorkflowService } from '../services/bonus-workflow-service';
import { createAuditLog } from '../middleware/audit';

const router = Router();

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
router.post('/cycles/:cycleId/bonus', authenticateToken, async (req, res, next) => {
  try {
    const cycleId = parseInt(req.params.cycleId);
    const workflow = await BonusWorkflowService.createForCycle(cycleId);
    
    await createAuditLog(req.user!.userId, {
      action: 'CREATE_BONUS_WORKFLOW',
      entityType: 'BONUS_WORKFLOW',
      entityId: workflow.id,
      changes: { cycleId: workflow.cycleId }
    });
    
    res.status(201).json(workflow);
  } catch (error) {
    next(error);
  }
});

// Update bonus workflow
router.patch('/cycles/:cycleId/bonus', authenticateToken, validateBody(updateBonusWorkflowSchema), async (req, res, next) => {
  try {
    const cycleId = parseInt(req.params.cycleId);
    
    const workflow = await BonusWorkflowService.update(cycleId, req.body);
    
    if (workflow) {
      await createAuditLog(req.user!.userId, {
        action: 'UPDATE_BONUS_WORKFLOW',
        entityType: 'BONUS_WORKFLOW',
        entityId: workflow.id,
        cycleId,
        changes: req.body
      });
    }
    
    res.json(workflow);
  } catch (error) {
    next(error);
  }
});

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

