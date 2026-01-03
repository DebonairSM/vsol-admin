import { Router, type Request, type Response } from 'express';
import { SettingsService } from '../services/settings-service';
import { authenticateAdmin } from '../middleware/admin-auth';
import { validateBody } from '../middleware/validate';
import { updateSettingsSchema, settingSchema } from '@vsol-admin/shared';

const router: Router = Router();

// All settings routes require admin authentication
router.use(authenticateAdmin);

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

// GET /api/settings/keys - List all setting keys
router.get('/keys', async (req, res, next) => {
  try {
    const keys = await SettingsService.listSettingKeys();
    res.json({ keys });
  } catch (error) {
    next(error);
  }
});

// GET /api/settings/kv/:key - Get a specific key-value setting (decrypted)
router.get('/kv/:key', async (req, res, next) => {
  try {
    const { key } = req.params;
    const value = await SettingsService.getSetting(key);
    res.json({ key, value });
  } catch (error) {
    next(error);
  }
});

// PUT /api/settings/kv/:key - Set a key-value setting
router.put('/kv/:key', validateBody(settingSchema), async (req, res, next) => {
  try {
    const { key } = req.params;
    const { value } = req.body;
    
    if (!req.user) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const setting = await SettingsService.setSetting(key, value, req.user.userId);
    
    // Create audit log
    const { createAuditLog } = await import('../middleware/audit');
    await createAuditLog(req.user.userId, {
      action: 'UPDATE_KV_SETTING',
      entityType: 'SETTING',
      entityId: setting.id,
      changes: {
        key,
        updated: true
      }
    });
    
    res.json({ 
      key: setting.key, 
      success: true,
      updatedAt: setting.updatedAt
    });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/settings/kv/:key - Delete a key-value setting
router.delete('/kv/:key', async (req, res, next) => {
  try {
    const { key } = req.params;
    
    if (!req.user) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    await SettingsService.deleteSetting(key);
    
    // Create audit log
    const { createAuditLog } = await import('../middleware/audit');
    await createAuditLog(req.user.userId, {
      action: 'DELETE_KV_SETTING',
      entityType: 'SETTING',
      entityId: 0, // No ID after deletion
      changes: { key, deleted: true }
    });
    
    res.json({ success: true, message: `Setting '${key}' deleted` });
  } catch (error) {
    next(error);
  }
});

export default router;
