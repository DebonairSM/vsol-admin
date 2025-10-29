import { Router } from 'express';
import { SettingsService } from '../services/settings-service';
import { authenticateToken } from '../middleware/auth';
import { validateBody } from '../middleware/validate';
import { updateSettingsSchema } from '@vsol-admin/shared';

const router = Router();

// All settings routes require authentication
router.use(authenticateToken);

// GET /api/settings
router.get('/', async (req, res, next) => {
  try {
    const settings = await SettingsService.getSettings();
    res.json(settings);
  } catch (error) {
    next(error);
  }
});

// PUT /api/settings
router.put(
  '/',
  validateBody(updateSettingsSchema),
  async (req, res, next) => {
    try {
      // Get current settings first for audit log
      const currentSettings = await SettingsService.getSettings();
      const settings = await SettingsService.updateSettings(req.body);
      
      // Create audit log manually since we need the settings ID
      if (req.user) {
        const { createAuditLog } = await import('../middleware/audit');
        await createAuditLog(req.user.userId, {
          action: 'UPDATE_SETTINGS',
          entityType: 'SETTINGS',
          entityId: settings.id,
          changes: {
            old: { defaultOmnigoBonus: currentSettings.defaultOmnigoBonus },
            new: { defaultOmnigoBonus: settings.defaultOmnigoBonus }
          }
        });
      }
      
      res.json(settings);
    } catch (error) {
      next(error);
    }
  }
);

export default router;
