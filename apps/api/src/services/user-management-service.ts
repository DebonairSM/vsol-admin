import { eq } from 'drizzle-orm';
import { db, users, consultants } from '../db';
import { hashPassword } from '../lib/password';
import { ValidationError, NotFoundError } from '../middleware/errors';
import { EmailService } from './email-service';
import { generateStrongPassword } from '../lib/password-generator';

const DEFAULT_CONSULTANT_PASSWORD = process.env.CONSULTANT_DEFAULT_PASSWORD || 'ChangeMe123!';

/**
 * Get login URL from environment or default to localhost
 */
function getLoginUrl(): string {
  // Priority: APP_LOGIN_URL env var > production portal URL
  return process.env.APP_LOGIN_URL || 'https://portal.vsol.software/';
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
   * Reset (or create) a consultant account by consultantId with a strong temporary password.
   * - Creates the user account if missing (role=consultant)
   * - Sets mustChangePassword=true
   * - Returns an email preview payload; optionally sends when configured
   */
  static async resetConsultantPasswordByConsultantId(
    consultantId: number,
    sendEmail: boolean = false
  ): Promise<{
    userId: number;
    username: string;
    consultantEmail: string | null;
    newPassword: string;
    mustChangePassword: true;
    emailPreview: { to: string; subject: string; html: string; text: string } | null;
    emailSent: boolean;
  }> {
    const consultant = await db.query.consultants.findFirst({
      where: eq(consultants.id, consultantId)
    });

    if (!consultant) {
      throw new NotFoundError('Consultant not found');
    }

    // Find existing user by consultantId
    let user = await db.query.users.findFirst({
      where: eq(users.consultantId, consultantId)
    });

    const newPassword = generateStrongPassword();
    const passwordHash = await hashPassword(newPassword);

    // Create user if missing
    if (!user) {
      const baseUsername = this.generateUsernameFromName(consultant.name);
      const username = await this.findAvailableUsername(baseUsername);

      const created = await db
        .insert(users)
        .values({
          username,
          passwordHash,
          role: 'consultant',
          mustChangePassword: true,
          consultantId
        })
        .returning();

      user = created[0] as any;
    }

    if (!user) {
      throw new NotFoundError('User not found');
    }

    if (user.role !== 'consultant') {
      throw new ValidationError('Can only reset passwords for consultant accounts');
    }

    await db
      .update(users)
      .set({
        passwordHash,
        mustChangePassword: true
      })
      .where(eq(users.id, user.id));

    const loginUrl = getLoginUrl();
    const consultantEmail = consultant.email ?? null;

    let emailPreview: { to: string; subject: string; html: string; text: string } | null = null;
    let emailSent = false;

    if (consultantEmail && consultantEmail.includes('@')) {
      const content = await EmailService.buildAccountCredentialsEmail({
        username: user.username,
        password: newPassword,
        email: consultantEmail,
        consultantName: consultant.name,
        loginUrl
      });

      emailPreview = {
        to: consultantEmail,
        subject: content.subject,
        html: content.html,
        text: content.text
      };
    }

    if (sendEmail) {
      if (!consultantEmail || !consultantEmail.includes('@')) {
        throw new ValidationError('Consultant email address is required to send credentials');
      }
      if (process.env.RESEND_KEY) {
        await EmailService.sendAccountCredentials({
          username: user.username,
          password: newPassword,
          email: consultantEmail,
          consultantName: consultant.name,
          loginUrl
        });
        emailSent = true;
      } else {
        emailSent = false;
      }
    }

    return {
      userId: user.id,
      username: user.username,
      consultantEmail,
      newPassword,
      mustChangePassword: true,
      emailPreview,
      emailSent
    };
  }

  private static generateUsernameFromName(name: string): string {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) {
      throw new ValidationError('Consultant name cannot be empty');
    }
    const firstName = parts[0];
    const lastInitial = parts.length > 1 ? parts[parts.length - 1][0].toUpperCase() : '';
    return `${firstName}${lastInitial}`;
  }

  private static async usernameExists(username: string): Promise<boolean> {
    const existing = await db.query.users.findFirst({
      where: eq(users.username, username)
    });
    return Boolean(existing);
  }

  private static async findAvailableUsername(baseUsername: string): Promise<string> {
    let candidate = baseUsername;
    let suffix = 1;
    while (await this.usernameExists(candidate)) {
      suffix += 1;
      candidate = `${baseUsername}${suffix}`;
    }
    return candidate;
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










