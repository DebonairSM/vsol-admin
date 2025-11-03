import { Router } from 'express';
import { eq } from 'drizzle-orm';
import { db, users } from '../db';
import { comparePassword, hashPassword, needsRehash } from '../lib/password';
import { signToken } from '../lib/jwt';
import { validateBody } from '../middleware/validate';
import { authenticateToken } from '../middleware/auth';
import { loginSchema, refreshTokenSchema } from '@vsol-admin/shared';
import { UnauthorizedError } from '../middleware/errors';
import { createRefreshToken, rotateRefreshToken, revokeRefreshToken, revokeAllUserTokens } from '../services/token-service';

const router: Router = Router();

// POST /api/auth/login
router.post('/login', validateBody(loginSchema), async (req, res, next) => {
  try {
    const { username, password } = req.body;

    // Find user by username
    const user = await db.query.users.findFirst({
      where: eq(users.username, username)
    });

    if (!user) {
      throw new UnauthorizedError('Invalid credentials');
    }

    // Verify password
    const isValidPassword = await comparePassword(password, user.passwordHash);
    if (!isValidPassword) {
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

    res.json({
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      // For backward compatibility, also return 'token'
      token: tokens.accessToken,
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
router.post('/refresh', validateBody(refreshTokenSchema), async (req, res, next) => {
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
        createdAt: true
      }
    });

    if (!user) {
      throw new UnauthorizedError('User not found');
    }

    res.json(user);
  } catch (error) {
    next(error);
  }
});

export default router;
