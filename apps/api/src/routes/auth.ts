import { Router } from 'express';
import { eq } from 'drizzle-orm';
import { db, users } from '../db';
import { comparePassword, hashPassword, needsRehash } from '../lib/password';
import { signToken } from '../lib/jwt';
import { validateBody } from '../middleware/validate';
import { authenticateToken } from '../middleware/auth';
import { loginSchema } from '@vsol-admin/shared';
import { UnauthorizedError } from '../middleware/errors';

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

    // Generate JWT token
    const token = signToken({
      userId: user.id,
      username: user.username,
      role: user.role
    });

    res.json({
      token,
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
