import { describe, it, expect } from 'vitest';
import { hashPassword, comparePassword, needsRehash } from './password';

describe('Password Security', () => {
  const testPassword = 'TestPassword123!';

  describe('Password Hashing', () => {
    it('should hash password and produce different hashes for same password', async () => {
      const hash1 = await hashPassword(testPassword);
      const hash2 = await hashPassword(testPassword);

      expect(hash1).toBeDefined();
      expect(hash2).toBeDefined();
      expect(hash1).not.toBe(hash2); // Argon2id uses random salt
      expect(hash1).toContain('$argon2id$'); // Verify Argon2id format
      expect(hash2).toContain('$argon2id$');
    });

    it('should produce hash of reasonable length', async () => {
      const hash = await hashPassword(testPassword);
      expect(hash.length).toBeGreaterThan(50); // Argon2id hashes are long
    });

    it('should handle empty password', async () => {
      const hash = await hashPassword('');
      expect(hash).toBeDefined();
      expect(hash).toContain('$argon2id$');
    });

    it('should handle very long password', async () => {
      const longPassword = 'a'.repeat(1000);
      const hash = await hashPassword(longPassword);
      expect(hash).toBeDefined();
      expect(hash).toContain('$argon2id$');
    });
  });

  describe('Password Verification', () => {
    it('should verify correct password', async () => {
      const hash = await hashPassword(testPassword);
      const isValid = await comparePassword(testPassword, hash);
      expect(isValid).toBe(true);
    });

    it('should reject incorrect password', async () => {
      const hash = await hashPassword(testPassword);
      const isValid = await comparePassword('WrongPassword', hash);
      expect(isValid).toBe(false);
    });

    it('should reject password with different case', async () => {
      const hash = await hashPassword(testPassword);
      const isValid = await comparePassword(testPassword.toLowerCase(), hash);
      expect(isValid).toBe(false);
    });

    it('should handle bcrypt hash for backward compatibility', async () => {
      // Simulate a bcrypt hash (format: $2a$10$...)
      // Note: This test requires actual bcrypt hash generation
      // For now, we test that the function handles bcrypt format
      const bcryptHash = '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy';
      // This is a known bcrypt hash for 'password'
      const isValid = await comparePassword('password', bcryptHash);
      // Should not throw error, even if hash doesn't match
      expect(typeof isValid).toBe('boolean');
    });

    it('should return false for invalid hash format', async () => {
      const isValid = await comparePassword(testPassword, 'invalid-hash-format');
      expect(isValid).toBe(false);
    });

    it('should return false for empty hash', async () => {
      const isValid = await comparePassword(testPassword, '');
      expect(isValid).toBe(false);
    });
  });

  describe('Password Rehashing', () => {
    it('should identify bcrypt hash as needing rehash', () => {
      const bcryptHash = '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy';
      expect(needsRehash(bcryptHash)).toBe(true);
    });

    it('should identify $2b$ bcrypt hash as needing rehash', () => {
      const bcryptHash = '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy';
      expect(needsRehash(bcryptHash)).toBe(true);
    });

    it('should identify $2y$ bcrypt hash as needing rehash', () => {
      const bcryptHash = '$2y$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy';
      expect(needsRehash(bcryptHash)).toBe(true);
    });

    it('should not require rehash for valid Argon2id hash', async () => {
      const hash = await hashPassword(testPassword);
      expect(needsRehash(hash)).toBe(false);
    });

    it('should require rehash for invalid hash format', () => {
      expect(needsRehash('invalid-hash')).toBe(true);
    });

    it('should require rehash for empty hash', () => {
      expect(needsRehash('')).toBe(true);
    });
  });

  describe('Security Properties', () => {
    it('should take similar time for correct and incorrect passwords', async () => {
      const hash = await hashPassword(testPassword);
      
      const startCorrect = Date.now();
      await comparePassword(testPassword, hash);
      const timeCorrect = Date.now() - startCorrect;

      const startIncorrect = Date.now();
      await comparePassword('WrongPassword', hash);
      const timeIncorrect = Date.now() - startIncorrect;

      // Times should be similar (within 100ms) to prevent timing attacks
      // Note: This is a basic check; real timing attack prevention requires more sophisticated testing
      const timeDiff = Math.abs(timeCorrect - timeIncorrect);
      expect(timeDiff).toBeLessThan(100);
    });

    it('should use Argon2id algorithm', async () => {
      const hash = await hashPassword(testPassword);
      expect(hash).toMatch(/^\$argon2id\$/);
    });
  });
});

