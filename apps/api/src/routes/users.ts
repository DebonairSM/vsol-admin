import { Router } from 'express';
import { authenticateToken } from '../middleware/auth';
import { ForbiddenError } from '../middleware/errors';
import { UserManagementService } from '../services/user-management-service';
import { validateBody } from '../middleware/validate';
import { z } from 'zod';

const router: Router = Router();

// All routes require admin authentication
router.use(authenticateToken);

// Middleware to ensure user is admin
function requireAdmin(req: any, res: any, next: any) {
  if (req.user?.role !== 'admin') {
    throw new ForbiddenError('Admin access required');
  }
  next();
}

// GET /api/users/consultants - List all consultant user accounts
router.get('/consultants', requireAdmin, async (req, res, next) => {
  try {
    const consultantUsers = await UserManagementService.getConsultantUsers();
    res.json(consultantUsers);
  } catch (error) {
    next(error);
  }
});

// POST /api/users/:id/reset-password - Reset consultant password to default
const resetPasswordSchema = z.object({
  sendEmail: z.boolean().optional().default(false)
});

router.post('/:id/reset-password', requireAdmin, validateBody(resetPasswordSchema), async (req, res, next) => {
  try {
    const userId = parseInt(req.params.id);
    const { sendEmail } = req.body;

    const newPassword = await UserManagementService.resetPassword(userId, sendEmail);

    res.json({
      success: true,
      message: 'Password reset successfully',
      newPassword: newPassword, // Return for display (admin can see it)
      emailSent: sendEmail
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/users/:id/send-credentials - Send account credentials via email
router.post('/:id/send-credentials', requireAdmin, async (req, res, next) => {
  try {
    const userId = parseInt(req.params.id);

    await UserManagementService.sendCredentials(userId);

    res.json({
      success: true,
      message: 'Credentials email sent successfully'
    });
  } catch (error) {
    next(error);
  }
});

export default router;

