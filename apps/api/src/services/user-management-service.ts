import { eq } from 'drizzle-orm';
import { db, users, consultants } from '../db';
import { hashPassword } from '../lib/password';
import { ValidationError, NotFoundError } from '../middleware/errors';
import { EmailService } from './email-service';

const DEFAULT_CONSULTANT_PASSWORD = process.env.CONSULTANT_DEFAULT_PASSWORD || 'ChangeMe123!';

/**
 * Get login URL from environment or default to localhost
 */
function getLoginUrl(): string {
  // Priority: APP_LOGIN_URL env var > localhost
  return process.env.APP_LOGIN_URL || 'http://localhost:5173';
}

export class UserManagementService {
  /**
   * Get all consultant user accounts with their linked consultant info
   */
  static async getConsultantUsers() {
    const consultantUsers = await db.query.users.findMany({
      where: eq(users.role, 'consultant'),
      with: {
        consultant: true
      }
    });

    return consultantUsers.map(user => ({
      id: user.id,
      username: user.username,
      role: user.role,
      mustChangePassword: user.mustChangePassword,
      consultantId: user.consultantId,
      consultant: user.consultant ? {
        id: user.consultant.id,
        name: user.consultant.name,
        email: user.consultant.email
      } : null,
      createdAt: user.createdAt
    }));
  }

  /**
   * Reset a consultant's password to the default value
   * Sets mustChangePassword flag to true
   * Returns the new password (plaintext, for email sending)
   */
  static async resetPassword(userId: number, sendEmail: boolean = false): Promise<string> {
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
      with: {
        consultant: true
      }
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    if (user.role !== 'consultant') {
      throw new ValidationError('Can only reset passwords for consultant accounts');
    }

    // Generate new default password
    const newPassword = DEFAULT_CONSULTANT_PASSWORD;
    const passwordHash = await hashPassword(newPassword);

    // Update password and set mustChangePassword flag
    await db.update(users)
      .set({
        passwordHash,
        mustChangePassword: true
      })
      .where(eq(users.id, userId));

    // Send email if requested
    if (sendEmail && user.consultant?.email) {
      try {
        await EmailService.sendAccountCredentials({
          username: user.username,
          password: newPassword,
          email: user.consultant.email,
          consultantName: user.consultant.name,
          loginUrl: getLoginUrl()
        });
      } catch (error) {
        // Log error but don't fail the password reset
        console.error(`Failed to send password reset email to ${user.consultant.email}:`, error);
      }
    }

    return newPassword;
  }

  /**
   * Send account credentials email to a consultant
   * Uses the consultant's current password (or resets if needed)
   */
  static async sendCredentials(userId: number): Promise<void> {
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
      with: {
        consultant: true
      }
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    if (user.role !== 'consultant') {
      throw new ValidationError('Can only send credentials for consultant accounts');
    }

    if (!user.consultant?.email) {
      throw new ValidationError('Consultant email address is required');
    }

    // If password needs to be reset, reset it first
    let password = DEFAULT_CONSULTANT_PASSWORD;
    if (user.mustChangePassword) {
      // Password was already reset, use default
      // (In a real scenario, we'd need to store the plaintext temporarily or reset again)
      // For now, we'll reset it to ensure we have the correct password
      password = await this.resetPassword(userId, false);
    } else {
      // We can't retrieve the plaintext password, so we need to reset it
      // This is a limitation - in production, you might want to store a temporary password
      password = await this.resetPassword(userId, false);
    }

    // Send email with credentials
    await EmailService.sendAccountCredentials({
      username: user.username,
      password: password,
      email: user.consultant.email,
      consultantName: user.consultant.name,
      loginUrl: getLoginUrl()
    });
  }

  /**
   * Get a consultant user by consultant ID
   */
  static async getByConsultantId(consultantId: number) {
    const user = await db.query.users.findFirst({
      where: eq(users.consultantId, consultantId),
      with: {
        consultant: true
      }
    });

    return user;
  }
}



