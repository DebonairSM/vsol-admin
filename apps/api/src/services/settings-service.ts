import { eq } from 'drizzle-orm';
import { db, systemSettings } from '../db';
import { UpdateSettingsRequest, SystemSettings } from '@vsol-admin/shared';
import { NotFoundError } from '../middleware/errors';

export class SettingsService {
  /**
   * Get current system settings (singleton pattern - always returns first row)
   * Creates default row if it doesn't exist
   */
  static async getSettings(): Promise<SystemSettings> {
    let settings = await db.query.systemSettings.findFirst({
      orderBy: (settings, { asc }) => [asc(settings.id)]
    });

    // If no settings exist, create default row
    if (!settings) {
      const [created] = await db.insert(systemSettings)
        .values({
          defaultOmnigoBonus: 0,
          updatedAt: new Date()
        })
        .returning();

      if (!created) {
        throw new NotFoundError('Failed to create system settings');
      }

      return {
        id: created.id,
        defaultOmnigoBonus: created.defaultOmnigoBonus || 0,
        updatedAt: created.updatedAt
      };
    }

    return {
      id: settings.id,
      defaultOmnigoBonus: settings.defaultOmnigoBonus || 0,
      updatedAt: settings.updatedAt
    };
  }

  /**
   * Update system settings (singleton pattern - updates first row)
   */
  static async updateSettings(data: UpdateSettingsRequest): Promise<SystemSettings> {
    // Get existing settings (or create if doesn't exist)
    const existing = await this.getSettings();

    const updated = await db.update(systemSettings)
      .set({
        defaultOmnigoBonus: data.defaultOmnigoBonus,
        updatedAt: new Date()
      })
      .where(eq(systemSettings.id, existing.id))
      .returning();

    if (!updated || updated.length === 0) {
      throw new NotFoundError('System settings not found');
    }

    const result = updated[0];
    return {
      id: result.id,
      defaultOmnigoBonus: result.defaultOmnigoBonus || 0,
      updatedAt: result.updatedAt
    };
  }
}
