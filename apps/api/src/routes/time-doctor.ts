import { Router } from 'express';
import { timeDoctorService } from '../services/time-doctor-service';
import { authenticateToken } from '../middleware/auth';
import { auditMiddleware } from '../middleware/audit';

const router = Router();

// Apply authentication to all Time Doctor routes
router.use(authenticateToken);

/**
 * GET /api/time-doctor/sync
 * Manual sync trigger for all consultants
 */
router.get('/sync', auditMiddleware('SYNC_ALL_TIME_DOCTOR', 'TIME_DOCTOR'), async (req, res) => {
  try {
    const result = await timeDoctorService.syncAllConsultants();
    
    if (result.success) {
      res.json({
        success: true,
        message: `Successfully synced ${result.synced} of ${result.totalConsultants} consultants`,
        synced: result.synced,
        errors: result.errors,
        totalConsultants: result.totalConsultants,
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Sync failed',
        errors: result.errors,
      });
    }
  } catch (error) {
    console.error('Sync all consultants error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error during sync',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /api/time-doctor/sync/:consultantId
 * Sync specific consultant with Time Doctor data
 */
router.post('/sync/:consultantId', auditMiddleware('SYNC_CONSULTANT_TIME_DOCTOR', 'CONSULTANT'), async (req, res) => {
  try {
    const consultantId = parseInt(req.params.consultantId);
    
    if (isNaN(consultantId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid consultant ID',
      });
    }

    const result = await timeDoctorService.syncConsultantById(consultantId);
    
    if (result.success) {
      res.json({
        success: true,
        message: `Consultant ${consultantId} synced successfully`,
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.error || 'Sync failed',
      });
    }
  } catch (error) {
    console.error('Sync consultant error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error during sync',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/time-doctor/status
 * Check sync status for all consultants
 */
router.get('/status', async (req, res) => {
  try {
    const result = await timeDoctorService.getSyncStatus();
    
    if (result.success) {
      res.json({
        success: true,
        status: result.status,
      });
    } else {
      res.status(500).json({
        success: false,
        message: result.error || 'Failed to get sync status',
      });
    }
  } catch (error) {
    console.error('Get sync status error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error getting sync status',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * PUT /api/time-doctor/consultant/:consultantId/toggle-sync
 * Toggle Time Doctor sync for a specific consultant
 */
router.put('/consultant/:consultantId/toggle-sync', auditMiddleware('TOGGLE_TIME_DOCTOR_SYNC', 'CONSULTANT'), async (req, res) => {
  try {
    const consultantId = parseInt(req.params.consultantId);
    const { enabled } = req.body;
    
    if (isNaN(consultantId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid consultant ID',
      });
    }

    if (typeof enabled !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: 'enabled must be a boolean value',
      });
    }

    const result = await timeDoctorService.toggleConsultantSync(consultantId, enabled);
    
    if (result.success) {
      res.json({
        success: true,
        message: `Time Doctor sync ${enabled ? 'enabled' : 'disabled'} for consultant ${consultantId}`,
      });
    } else {
      res.status(500).json({
        success: false,
        message: result.error || 'Failed to toggle sync setting',
      });
    }
  } catch (error) {
    console.error('Toggle sync error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error toggling sync',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/time-doctor/settings
 * Fetch current Time Doctor payroll settings (read-only)
 */
router.get('/settings', async (req, res) => {
  try {
    const result = await timeDoctorService.fetchPayrollSettings();
    
    if (result.success) {
      res.json({
        success: true,
        data: result.data,
      });
    } else {
      res.status(500).json({
        success: false,
        message: result.error || 'Failed to fetch Time Doctor settings',
      });
    }
  } catch (error) {
    console.error('Fetch Time Doctor settings error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error fetching settings',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;
