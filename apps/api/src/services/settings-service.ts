import { eq } from 'drizzle-orm';
import { db, systemSettings, settings } from '../db';
import { UpdateSettingsRequest, SystemSettings, Setting } from '@vsol-admin/shared';
import { NotFoundError } from '../middleware/errors';
import { encryptValue, decryptValue } from '../lib/encryption';

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

  /**
   * Get a key-value setting by key.
   * Returns decrypted value.
   * @throws NotFoundError if setting does not exist
   */
  static async getSetting(key: string): Promise<string> {
    const setting = await db.query.settings.findFirst({
      where: eq(settings.key, key)
    });

    if (!setting) {
      throw new NotFoundError(`Setting with key '${key}' not found`);
    }

    try {
      return decryptValue(setting.value);
    } catch (error) {
      throw new Error(`Failed to decrypt setting '${key}': ${error}`);
    }
  }

  /**
   * Set a key-value setting.
   * Creates new setting if it doesn't exist, updates if it does.
   * Value is encrypted before storage.
   */
  static async setSetting(key: string, value: string, userId: number): Promise<Setting> {
    const encryptedValue = encryptValue(value);

    // Check if setting exists
    const existing = await db.query.settings.findFirst({
      where: eq(settings.key, key)
    });

    if (existing) {
      // Update existing setting
      const updated = await db.update(settings)
        .set({
          value: encryptedValue,
          updatedAt: new Date(),
          updatedBy: userId
        })
        .where(eq(settings.key, key))
        .returning();

      if (!updated || updated.length === 0) {
        throw new Error(`Failed to update setting '${key}'`);
      }

      return {
        id: updated[0].id,
        key: updated[0].key,
        value: updated[0].value,
        updatedAt: updated[0].updatedAt,
        updatedBy: updated[0].updatedBy
      };
    } else {
      // Create new setting
      const created = await db.insert(settings)
        .values({
          key,
          value: encryptedValue,
          updatedAt: new Date(),
          updatedBy: userId
        })
        .returning();

      if (!created || created.length === 0) {
        throw new Error(`Failed to create setting '${key}'`);
      }

      return {
        id: created[0].id,
        key: created[0].key,
        value: created[0].value,
        updatedAt: created[0].updatedAt,
        updatedBy: created[0].updatedBy
      };
    }
  }

  /**
   * List all setting keys (without values for security).
   */
  static async listSettingKeys(): Promise<string[]> {
    const allSettings = await db.select({ key: settings.key }).from(settings);
    return allSettings.map(s => s.key);
  }

  /**
   * Delete a setting by key.
   */
  static async deleteSetting(key: string): Promise<void> {
    const result = await db.delete(settings)
      .where(eq(settings.key, key))
      .returning();

    if (!result || result.length === 0) {
      throw new NotFoundError(`Setting with key '${key}' not found`);
    }
  }
}
