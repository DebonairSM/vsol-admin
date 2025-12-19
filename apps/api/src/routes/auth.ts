import { Router } from 'express';
import { eq } from 'drizzle-orm';
import { db, users } from '../db';
import { comparePassword, hashPassword, needsRehash } from '../lib/password';
import { signToken } from '../lib/jwt';
import { validateBody } from '../middleware/validate';
import { authenticateToken } from '../middleware/auth';
import { loginSchema, refreshTokenSchema, changePasswordSchema } from '@vsol-admin/shared';
import { UnauthorizedError } from '../middleware/errors';
import { createRefreshToken, rotateRefreshToken, revokeRefreshToken, revokeAllUserTokens } from '../services/token-service';
import { authRateLimiter } from '../middleware/rate-limit';
import { createBackup, shouldCreateBackup } from '../services/backup-service';
import { PasswordService } from '../services/password-service';

const router: Router = Router();

// POST /api/auth/login
// Apply strict rate limiting to prevent brute force attacks
router.post('/login', authRateLimiter, validateBody(loginSchema), async (req, res, next) => {
  try {
    const { username, password } = req.body;

    // Find user by username
    const user = await db.query.users.findFirst({
      where: eq(users.username, username)
    });

    // SECURITY: Always perform password comparison to prevent timing attacks
    // Use a dummy hash if user not found to maintain constant-time comparison
    const dummyHash = '$argon2id$v=19$m=65536,t=3,p=4$dummy$dummy';
    const hashToCompare = user?.passwordHash || dummyHash;
    
    // Verify password (will always take similar time whether user exists or not)
    const isValidPassword = await comparePassword(password, hashToCompare);
    
    // Only throw error after password comparison to prevent user enumeration
    if (!user || !isValidPassword) {
      throw new UnauthorizedError('Invalid credentials');
    }

    // Check if password hash needs rehashing (bcrypt → Argon2id migration)
    if (needsRehash(user.passwordHash)) {
      console.log(`🔄 Rehashing password for user ${username} (upgrading to Argon2id)`);
      const newHash = await hashPassword(password);
      
      await db.update(users)
        .set({ passwordHash: newHash })
        .where(eq(users.id, user.id));
    }

    // Get client metadata for security tracking
    const ipAddress = (req.headers['x-forwarded-for'] as string)?.split(',')[0] || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];

    // Generate access and refresh tokens
    const tokens = await createRefreshToken(
      user.id,
      {
        userId: user.id,
        username: user.username,
        role: user.role
      },
      ipAddress,
      userAgent
    );

    // Create automatic backup on login (only if enough time has passed since last backup)
    // This happens asynchronously so it doesn't slow down the login response
    if (shouldCreateBackup(60)) {
      createBackup('vsol-admin-login').catch((error) => {
        // Log error but don't fail login if backup fails
        console.error('Failed to create automatic backup on login:', error.message);
      });
    }

    // Return tokens and user info
    // If mustChangePassword is true, frontend will redirect to password change page
    // but user still needs tokens to authenticate for the password change endpoint
    res.json({
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      // For backward compatibility, also return 'token'
      token: tokens.accessToken,
      mustChangePassword: user.mustChangePassword,
      user: {
        id: user.id,
        username: user.username,
        role: user.role
      }
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/auth/refresh
// Rotate refresh token and get new access token
router.post('/refresh', authRateLimiter, validateBody(refreshTokenSchema), async (req, res, next) => {
  try {
    const refreshToken = req.body.refreshToken;
    
    if (!refreshToken) {
      throw new UnauthorizedError('Refresh token is required');
    }

    // Get client metadata for security tracking
    const ipAddress = (req.headers['x-forwarded-for'] as string)?.split(',')[0] || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];

    // Rotate the refresh token
    const tokens = await rotateRefreshToken(refreshToken, ipAddress, userAgent);

    res.json({
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      // For backward compatibility
      token: tokens.accessToken
    });
  } catch (error) {
    // Log security events
    if (error instanceof Error && error.message.includes('reuse detected')) {
      console.error('🚨 SECURITY: Token reuse detected', {
        ip: req.socket.remoteAddress,
        userAgent: req.headers['user-agent']
      });
    }
    next(new UnauthorizedError(error instanceof Error ? error.message : 'Invalid refresh token'));
  }
});

// POST /api/auth/logout
// Revoke the current refresh token
router.post('/logout', async (req, res, next) => {
  try {
    const refreshToken = req.body.refreshToken;
    
    if (refreshToken) {
      await revokeRefreshToken(refreshToken);
    }

    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    next(error);
  }
});

// POST /api/auth/logout-all
// Revoke all refresh tokens for the authenticated user (logout from all devices)
router.post('/logout-all', authenticateToken, async (req, res, next) => {
  try {
    await revokeAllUserTokens(req.user!.userId);

    res.json({ message: 'Logged out from all devices successfully' });
  } catch (error) {
    next(error);
  }
});

// GET /api/auth/me
router.get('/me', authenticateToken, async (req, res, next) => {
  try {
    const user = await db.query.users.findFirst({
      where: eq(users.id, req.user!.userId),
      columns: {
        id: true,
        username: true,
        role: true,
        mustChangePassword: true,
        createdAt: true
      }
    });

    if (!user) {
      throw new UnauthorizedError('User not found');
    }

    res.json({
      id: user.id,
      username: user.username,
      role: user.role,
      mustChangePassword: user.mustChangePassword,
      createdAt: user.createdAt
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/auth/change-password
router.post('/change-password', authenticateToken, validateBody(changePasswordSchema), async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user!.userId;

    await PasswordService.changePassword(userId, currentPassword, newPassword);

    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    next(error);
  }
});

export default router;
