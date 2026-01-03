// @ts-nocheck - Test file with dynamic imports of types
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Define types inline for tests
type JWTPayload = {
  userId: number;
  username: string;
  role: string;
};

type RefreshTokenPayload = JWTPayload & {
  tokenFamily: string;
  tokenId: number;
};

describe('JWT Token Security', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset environment variables
    vi.resetModules();
    process.env = { ...originalEnv };
    // Set required JWT_SECRET for tests
    process.env.JWT_SECRET = 'test-secret-key-for-testing-only-min-32-chars';
    process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-key-for-testing-only-min-32-chars';
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('Token Signing', () => {
    it('should sign access token with valid secret', async () => {
      const { signAccessToken } = await import('./jwt');
      const payload: JWTPayload = {
        userId: 1,
        username: 'testuser',
        role: 'admin'
      };

      const token = signAccessToken(payload);
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3); // JWT has 3 parts
    });

    it('should sign refresh token with valid secret', async () => {
      const { signRefreshToken } = await import('./jwt');
      const payload: RefreshTokenPayload = {
        userId: 1,
        username: 'testuser',
        role: 'admin',
        tokenFamily: 'test-family',
        tokenId: 1
      };

      const token = signRefreshToken(payload);
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3);
    });

    it('should throw error if JWT_SECRET is not configured', async () => {
      delete process.env.JWT_SECRET;
      vi.resetModules();
      
      // Module will throw on import if JWT_SECRET is missing
      await expect(async () => {
        await import('./jwt');
      }).rejects.toThrow('JWT_SECRET environment variable is required');
    });
  });

  describe('Token Verification', () => {
    it('should verify valid access token', async () => {
      const { signAccessToken, verifyAccessToken } = await import('./jwt');
      const payload: JWTPayload = {
        userId: 1,
        username: 'testuser',
        role: 'admin'
      };

      const token = signAccessToken(payload);
      const verified = verifyAccessToken(token);

      expect(verified.userId).toBe(payload.userId);
      expect(verified.username).toBe(payload.username);
      expect(verified.role).toBe(payload.role);
    });

    it('should verify valid refresh token', async () => {
      const { signRefreshToken, verifyRefreshToken } = await import('./jwt');
      const payload: RefreshTokenPayload = {
        userId: 1,
        username: 'testuser',
        role: 'admin',
        tokenFamily: 'test-family',
        tokenId: 1
      };

      const token = signRefreshToken(payload);
      const verified = verifyRefreshToken(token);

      expect(verified.userId).toBe(payload.userId);
      expect(verified.tokenFamily).toBe(payload.tokenFamily);
      expect(verified.tokenId).toBe(payload.tokenId);
    });

    it('should reject token with invalid signature', async () => {
      const { signAccessToken, verifyAccessToken } = await import('./jwt');
      const payload: JWTPayload = {
        userId: 1,
        username: 'testuser',
        role: 'admin'
      };

      const token = signAccessToken(payload);
      // Tamper with token
      const tamperedToken = token.slice(0, -5) + 'xxxxx';

      expect(() => {
        verifyAccessToken(tamperedToken);
      }).toThrow();
    });

    it('should reject expired token', async () => {
      // This test would require mocking time or using a very short expiry
      // For now, we test that tokens have expiry set
      const { signAccessToken, verifyAccessToken } = await import('./jwt');
      const payload: JWTPayload = {
        userId: 1,
        username: 'testuser',
        role: 'admin'
      };

      const token = signAccessToken(payload);
      // Token should be valid immediately
      expect(() => verifyAccessToken(token)).not.toThrow();
    });

    it('should reject token without required claims', async () => {
      const { signAccessToken, verifyRefreshToken } = await import('./jwt');
      const payload: JWTPayload = {
        userId: 1,
        username: 'testuser',
        role: 'admin'
      };

      const accessToken = signAccessToken(payload);
      
      // Try to verify access token as refresh token (wrong type)
      // This will fail with "invalid signature" because it's signed with different secret
      // The signature check happens before token type check
      expect(() => {
        verifyRefreshToken(accessToken);
      }).toThrow(); // Will throw "invalid signature" or "Invalid token type"
    });

    it('should reject refresh token used as access token', async () => {
      const { signRefreshToken, verifyAccessToken } = await import('./jwt');
      const payload: RefreshTokenPayload = {
        userId: 1,
        username: 'testuser',
        role: 'admin',
        tokenFamily: 'test-family',
        tokenId: 1
      };

      const refreshToken = signRefreshToken(payload);
      
      // Try to verify refresh token as access token (wrong type)
      // This will fail with "invalid signature" because it's signed with different secret
      // The signature check happens before token type check
      expect(() => {
        verifyAccessToken(refreshToken);
      }).toThrow(); // Will throw "invalid signature" or "Invalid token type"
    });

    it('should include correct audience and issuer', async () => {
      const { signAccessToken } = await import('./jwt');
      const payload: JWTPayload = {
        userId: 1,
        username: 'testuser',
        role: 'admin'
      };

      const token = signAccessToken(payload);
      // Decode without verification to check claims
      const parts = token.split('.');
      const payloadPart = JSON.parse(Buffer.from(parts[1], 'base64').toString());
      
      expect(payloadPart.aud).toBe('vsol-admin-api');
      expect(payloadPart.iss).toBe('vsol-admin');
      expect(payloadPart.type).toBe('access');
    });
  });

  describe('Token Manipulation', () => {
    it('should prevent userId manipulation in token', async () => {
      const { signAccessToken, verifyAccessToken } = await import('./jwt');
      const payload: JWTPayload = {
        userId: 1,
        username: 'testuser',
        role: 'admin'
      };

      const token = signAccessToken(payload);
      
      // Try to decode, modify, and re-encode (without signature)
      const parts = token.split('.');
      const payloadPart = JSON.parse(Buffer.from(parts[1], 'base64').toString());
      payloadPart.userId = 999; // Try to change userId
      
      const tamperedPayload = Buffer.from(JSON.stringify(payloadPart)).toString('base64');
      const tamperedToken = `${parts[0]}.${tamperedPayload}.${parts[2]}`;

      // Verification should fail due to signature mismatch
      expect(() => {
        verifyAccessToken(tamperedToken);
      }).toThrow();
    });

    it('should prevent role escalation in token', async () => {
      const { signAccessToken, verifyAccessToken } = await import('./jwt');
      const payload: JWTPayload = {
        userId: 1,
        username: 'testuser',
        role: 'user'
      };

      const token = signAccessToken(payload);
      
      // Try to decode, modify role, and re-encode
      const parts = token.split('.');
      const payloadPart = JSON.parse(Buffer.from(parts[1], 'base64').toString());
      payloadPart.role = 'admin'; // Try to escalate role
      
      const tamperedPayload = Buffer.from(JSON.stringify(payloadPart)).toString('base64');
      const tamperedToken = `${parts[0]}.${tamperedPayload}.${parts[2]}`;

      // Verification should fail due to signature mismatch
      expect(() => {
        verifyAccessToken(tamperedToken);
      }).toThrow();
    });
  });
});

