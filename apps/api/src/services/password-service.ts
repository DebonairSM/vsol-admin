import { eq } from 'drizzle-orm';
import { db, users } from '../db';
import { hashPassword, comparePassword } from '../lib/password';
import { ValidationError, UnauthorizedError } from '../middleware/errors';

export class PasswordService {
  /**
   * Change password for a user
   * Requires current password verification
   * Sets mustChangePassword to false after successful change
   */
  static async changePassword(
    userId: number,
    currentPassword: string,
    newPassword: string
  ): Promise<void> {
    // Get user
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId)
    });

    if (!user) {
      throw new UnauthorizedError('User not found');
    }

    // Verify current password
    const isValidPassword = await comparePassword(currentPassword, user.passwordHash);
    if (!isValidPassword) {
      throw new UnauthorizedError('Current password is incorrect');
    }

    // Validate new password
    if (newPassword.length < 8) {
      throw new ValidationError('New password must be at least 8 characters');
    }

    // Hash new password
    const newPasswordHash = await hashPassword(newPassword);

    // Update password and clear mustChangePassword flag
    await db.update(users)
      .set({
        passwordHash: newPasswordHash,
        mustChangePassword: false
      })
      .where(eq(users.id, userId));
  }
}










