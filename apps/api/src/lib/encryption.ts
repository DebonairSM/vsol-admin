import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const TAG_LENGTH = 16;
const SALT_LENGTH = 32;

/**
 * Get encryption key from environment variable.
 * In production, this should be retrieved from a secure key management service.
 */
function getEncryptionKey(): string {
  const key = process.env.SETTINGS_ENCRYPTION_KEY;
  if (!key) {
    throw new Error(
      'SETTINGS_ENCRYPTION_KEY environment variable is not set. ' +
      'Please set it to a secure 64-character hex string (32 bytes).'
    );
  }
  if (key.length !== 64) {
    throw new Error(
      'SETTINGS_ENCRYPTION_KEY must be 64 characters (32 bytes in hex). ' +
      `Current length: ${key.length}`
    );
  }
  return key;
}

/**
 * Generate a secure encryption key (64 hex characters = 32 bytes)
 */
export function generateEncryptionKey(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Encrypt a string value using AES-256-GCM.
 * Returns base64-encoded encrypted data with IV and auth tag.
 */
export function encryptValue(plaintext: string): string {
  try {
    const key = Buffer.from(getEncryptionKey(), 'hex');
    const iv = crypto.randomBytes(IV_LENGTH);
    
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    
    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    // Combine IV + encrypted data + auth tag
    const combined = Buffer.concat([
      iv,
      Buffer.from(encrypted, 'hex'),
      authTag
    ]);
    
    return combined.toString('base64');
  } catch (error) {
    throw new Error(`Failed to encrypt value: ${error}`);
  }
}

/**
 * Decrypt a base64-encoded encrypted value.
 * Expects format: IV + encrypted data + auth tag (all base64-encoded).
 */
export function decryptValue(encrypted: string): string {
  try {
    const key = Buffer.from(getEncryptionKey(), 'hex');
    const combined = Buffer.from(encrypted, 'base64');
    
    // Extract IV, encrypted data, and auth tag
    const iv = combined.subarray(0, IV_LENGTH);
    const authTag = combined.subarray(combined.length - TAG_LENGTH);
    const encryptedData = combined.subarray(IV_LENGTH, combined.length - TAG_LENGTH);
    
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encryptedData.toString('hex'), 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    throw new Error(`Failed to decrypt value: ${error}`);
  }
}

/**
 * Mask a sensitive value for display purposes.
 * Shows only the last 4 characters.
 */
export function maskValue(value: string, visibleChars: number = 4): string {
  if (value.length <= visibleChars) {
    return '*'.repeat(value.length);
  }
  const masked = '*'.repeat(value.length - visibleChars);
  return masked + value.slice(-visibleChars);
}

