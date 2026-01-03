import { Router, type Request, type Response } from 'express';
import { TimeDoctorService } from '../services/timedoctor-service';
import { authenticateAdmin } from '../middleware/admin-auth';

const router: Router = Router();

// All Time Doctor routes require admin authentication
router.use(authenticateAdmin);

/**
 * GET /api/time-doctor/test
 * Test Time Doctor API connection with current credentials
 */
router.get('/test', async (req, res, next) => {
  try {
    const result = await TimeDoctorService.testConnection();
    
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
 * GET /api/time-doctor/users
 * Fetch all users from Time Doctor API
 */
router.get('/users', async (req, res, next) => {
  try {
    const users = await TimeDoctorService.getUsers();
    res.json({
      success: true,
      count: users.length,
      users
    });
  } catch (error: any) {
    next(error);
  }
});

/**
 * GET /api/time-doctor/activity
 * Fetch activity/work hours data for a date range
 * Query params: from (YYYY-MM-DD), to (YYYY-MM-DD), userId (optional)
 */
router.get('/activity', async (req, res, next) => {
  try {
    const { from, to, userId } = req.query;

    // Validate required parameters
    if (!from || !to) {
      return res.status(400).json({
        success: false,
        message: 'Missing required parameters: from and to dates are required'
      });
    }

    const activities = await TimeDoctorService.getActivity({
      from: from as string,
      to: to as string,
      userId: userId as string | undefined
    });

    res.json({
      success: true,
      count: activities.length,
      activities
    });
  } catch (error: any) {
    next(error);
  }
});

export default router;

