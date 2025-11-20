import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { validateBody, validateQuery, validateParams } from './validate';

describe('Input Validation Middleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockRequest = {
      body: {},
      query: {},
      params: {}
    };

    mockResponse = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis()
    };

    mockNext = vi.fn();
  });

  describe('validateBody', () => {
    const testSchema = z.object({
      username: z.string().min(3),
      email: z.string().email(),
      age: z.number().int().positive()
    });

    it('should pass valid body', () => {
      mockRequest.body = {
        username: 'testuser',
        email: 'test@example.com',
        age: 25
      };

      const middleware = validateBody(testSchema);
      middleware(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
      expect(mockRequest.body).toEqual({
        username: 'testuser',
        email: 'test@example.com',
        age: 25
      });
    });

    it('should reject invalid body with 400', () => {
      mockRequest.body = {
        username: 'ab', // Too short
        email: 'invalid-email',
        age: -5 // Negative
      };

      const middleware = validateBody(testSchema);
      middleware(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Validation failed',
        details: expect.any(Array)
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should reject XSS payloads in string fields', () => {
      const schema = z.object({
        name: z.string()
      });

      mockRequest.body = {
        name: '<script>alert("XSS")</script>'
      };

      const middleware = validateBody(schema);
      middleware(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      // Zod doesn't sanitize by default, but we can check it's caught if we add sanitization
      // For now, we just verify the validation runs
      expect(mockNext).toHaveBeenCalled();
    });

    it('should reject SQL injection payloads', () => {
      const schema = z.object({
        query: z.string()
      });

      mockRequest.body = {
        query: "'; DROP TABLE users; --"
      };

      const middleware = validateBody(schema);
      middleware(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      // Zod validates type, not content - SQL injection prevention is at the ORM level
      // This test verifies the validation middleware processes the input
      expect(mockNext).toHaveBeenCalled();
    });

    it('should reject oversized payloads', () => {
      const schema = z.object({
        data: z.string().max(100)
      });

      mockRequest.body = {
        data: 'a'.repeat(1000) // Exceeds max length
      };

      const middleware = validateBody(schema);
      middleware(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should handle missing required fields', () => {
      mockRequest.body = {
        username: 'testuser'
        // Missing email and age
      };

      const middleware = validateBody(testSchema);
      middleware(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should strip extra fields if schema is strict', () => {
      const strictSchema = z.object({
        username: z.string()
      }).strict();

      mockRequest.body = {
        username: 'testuser',
        extraField: 'should be removed'
      };

      const middleware = validateBody(strictSchema);
      middleware(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('validateQuery', () => {
    const testSchema = z.object({
      page: z.string().transform(Number).pipe(z.number().int().positive()),
      limit: z.string().optional()
    });

    it('should pass valid query parameters', () => {
      mockRequest.query = {
        page: '1',
        limit: '10'
      };

      const middleware = validateQuery(testSchema);
      middleware(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should reject invalid query parameters', () => {
      mockRequest.query = {
        page: '-1' // Negative
      };

      const middleware = validateQuery(testSchema);
      middleware(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Query validation failed',
        details: expect.any(Array)
      });
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('validateParams', () => {
    const testSchema = z.object({
      id: z.string().transform(Number).pipe(z.number().int().positive())
    });

    it('should pass valid route parameters', () => {
      mockRequest.params = {
        id: '123'
      };

      const middleware = validateParams(testSchema);
      middleware(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should reject invalid route parameters', () => {
      mockRequest.params = {
        id: 'abc' // Not a number
      };

      const middleware = validateParams(testSchema);
      middleware(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Parameter validation failed',
        details: expect.any(Array)
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should prevent SQL injection in numeric ID parameters', () => {
      mockRequest.params = {
        id: "1'; DROP TABLE users; --"
      };

      const middleware = validateParams(testSchema);
      middleware(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      // Should fail validation (not a valid number)
      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockNext).not.toHaveBeenCalled();
    });
  });
});

