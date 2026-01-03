import argon2 from 'argon2';
import bcrypt from 'bcryptjs';

/**
 * Argon2id configuration for password hashing
 * 
 * Parameters follow OWASP recommendations:
 * - Type: Argon2id (hybrid of Argon2i and Argon2d)
 * - Memory cost: 65536 KB (64 MB)
 * - Time cost: 3 iterations
 * - Parallelism: 4 threads
 * - Hash length: 32 bytes (256 bits)
 * 
 * These settings provide strong security while maintaining
 * reasonable performance for authentication flows.
 */
const ARGON2_OPTIONS: argon2.Options & { raw?: false } = {
  type: argon2.argon2id,
  memoryCost: 65536, // 64 MB
  timeCost: 3,       // 3 iterations
  parallelism: 4,    // 4 threads
  hashLength: 32,    // 32 bytes = 256 bits
  raw: false
};

/**
 * Hash a password using Argon2id
 * 
 * @param password - Plain text password to hash
 * @returns Promise<string> - Argon2id hash string
 * 
 * @example
 * const hash = await hashPassword('mySecurePassword123');
 * // Returns: $argon2id$v=19$m=65536,t=3,p=4$...
 */
export async function hashPassword(password: string): Promise<string> {
  try {
    return await argon2.hash(password, ARGON2_OPTIONS as argon2.Options & { raw?: false });
  } catch (error) {
    throw new Error(`Password hashing failed: ${error}`);
  }
}

/**
 * Verify a password against an Argon2id hash
 * 
 * This function also handles backward compatibility with bcrypt hashes
 * from the previous implementation. If a bcrypt hash is detected, it
 * will verify using bcrypt and return true, but you should rehash the
 * password with Argon2id on the next login.
 * 
 * @param password - Plain text password to verify
 * @param hash - Argon2id or bcrypt hash to verify against
 * @returns Promise<boolean> - True if password matches hash
 * 
 * @example
 * const isValid = await comparePassword('myPassword', storedHash);
 * if (isValid) {
 *   // Password is correct
 * }
 */
export async function comparePassword(password: string, hash: string): Promise<boolean> {
  try {
    // Check if this is a bcrypt hash (backward compatibility)
    if (hash.startsWith('$2a$') || hash.startsWith('$2b$') || hash.startsWith('$2y$')) {
      console.warn('⚠️  bcrypt hash detected. Consider rehashing with Argon2id on next login.');
      
      // Use bcrypt for backward compatibility
      return await bcrypt.compare(password, hash);
    }
    
    // Verify using Argon2id
    return await argon2.verify(hash, password);
  } catch (error) {
    // If verification fails due to invalid hash format, return false
    // Don't throw error to prevent timing attacks
    return false;
  }
}

/**
 * Check if a password hash needs rehashing
 * 
 * Returns true if:
 * - The hash is a bcrypt hash (should be upgraded to Argon2id)
 * - The Argon2 parameters don't match current recommendations
 * 
 * @param hash - Password hash to check
 * @returns boolean - True if hash should be regenerated
 * 
 * @example
 * if (needsRehash(user.passwordHash)) {
 *   const newHash = await hashPassword(password);
 *   await updateUser(user.id, { passwordHash: newHash });
 * }
 */
export function needsRehash(hash: string): boolean {
  // bcrypt hashes should be upgraded
  if (hash.startsWith('$2a$') || hash.startsWith('$2b$') || hash.startsWith('$2y$')) {
    return true;
  }
  
  // Check if Argon2 parameters need updating
  try {
    return argon2.needsRehash(hash, ARGON2_OPTIONS);
  } catch (error) {
    // If we can't parse the hash, it should probably be rehashed
    return true;
  }
}

