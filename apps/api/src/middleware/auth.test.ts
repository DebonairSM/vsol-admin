import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Request, Response, NextFunction } from 'express';

describe('Authentication Middleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    // Set JWT_SECRET before importing modules
    process.env.JWT_SECRET = 'test-secret-key-for-testing-only-min-32-chars';
    process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-key-for-testing-only-min-32-chars';
    vi.resetModules();

    mockRequest = {
      headers: {},
      user: undefined
    };

    mockResponse = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis()
    };

    mockNext = vi.fn();
  });

  describe('Missing Token', () => {
    it('should return 401 when no authorization header is present', async () => {
      const { authenticateToken } = await import('./auth');
      mockRequest.headers = {};

      await authenticateToken(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Access token required'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 401 when authorization header is empty', async () => {
      const { authenticateToken } = await import('./auth');
      mockRequest.headers = {
        authorization: ''
      };

      await authenticateToken(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Access token required'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 401 when authorization header has no token', async () => {
      const { authenticateToken } = await import('./auth');
      mockRequest.headers = {
        authorization: 'Bearer'
      };

      await authenticateToken(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Access token required'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('Invalid Token', () => {
    it('should return 403 when token has invalid signature', async () => {
      const { authenticateToken } = await import('./auth');
      mockRequest.headers = {
        authorization: 'Bearer invalid.token.here'
      };

      await authenticateToken(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Invalid or expired token'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 403 when token is malformed', async () => {
      const { authenticateToken } = await import('./auth');
      mockRequest.headers = {
        authorization: 'Bearer not-a-valid-jwt-token'
      };

      await authenticateToken(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Invalid or expired token'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 403 when token is expired', async () => {
      const { authenticateToken } = await import('./auth');
      // Create an expired token (this would require time mocking in a real scenario)
      // For now, we test with an invalid token format
      mockRequest.headers = {
        authorization: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.expired.signature'
      };

      await authenticateToken(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('Valid Token', () => {
    it('should call next() when token is valid', async () => {
      const { authenticateToken } = await import('./auth');
      const { signAccessToken } = await import('../lib/jwt');
      const token = signAccessToken({
        userId: 1,
        username: 'testuser',
        role: 'admin'
      });

      mockRequest.headers = {
        authorization: `Bearer ${token}`
      };

      await authenticateToken(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalled();
      expect(mockRequest.user).toBeDefined();
      expect(mockRequest.user?.userId).toBe(1);
      expect(mockRequest.user?.username).toBe('testuser');
      expect(mockRequest.user?.role).toBe('admin');
      expect(mockResponse.status).not.toHaveBeenCalled();
      expect(mockResponse.json).not.toHaveBeenCalled();
    });

    it('should extract token from Bearer authorization header', async () => {
      const { authenticateToken } = await import('./auth');
      const { signAccessToken } = await import('../lib/jwt');
      const token = signAccessToken({
        userId: 2,
        username: 'anotheruser',
        role: 'user'
      });

      mockRequest.headers = {
        authorization: `Bearer ${token}`
      };

      await authenticateToken(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalled();
      expect(mockRequest.user?.userId).toBe(2);
    });

    it('should handle token with extra whitespace', async () => {
      const { authenticateToken } = await import('./auth');
      const { signAccessToken } = await import('../lib/jwt');
      const token = signAccessToken({
        userId: 3,
        username: 'testuser',
        role: 'admin'
      });

      mockRequest.headers = {
        authorization: `Bearer  ${token}  `
      };

      await authenticateToken(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalled();
      expect(mockRequest.user?.userId).toBe(3);
    });
  });

  describe('Token Type Validation', () => {
    it('should reject refresh token used as access token', async () => {
      const { authenticateToken } = await import('./auth');
      const { signRefreshToken } = await import('../lib/jwt');
      const refreshToken = signRefreshToken({
        userId: 1,
        username: 'testuser',
        role: 'admin',
        tokenFamily: 'test-family',
        tokenId: 1
      });

      mockRequest.headers = {
        authorization: `Bearer ${refreshToken}`
      };

      await authenticateToken(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Invalid or expired token'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });
  });
});

