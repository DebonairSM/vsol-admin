import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';

/**
 * Validate request body using Zod schema with safeParse
 * Fails closed - rejects invalid input without processing
 */
export function validateBody(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    
    if (!result.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: result.error.errors
      });
    }
    
    // Replace body with validated data
    req.body = result.data;
    next();
  };
}

/**
 * Validate query parameters using Zod schema with safeParse
 * Fails closed - rejects invalid input without processing
 */
export function validateQuery(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.query);
    
    if (!result.success) {
      return res.status(400).json({
        error: 'Query validation failed',
        details: result.error.errors
      });
    }
    
    // Replace query with validated data
    req.query = result.data as any;
    next();
  };
}

/**
 * Validate route parameters using Zod schema with safeParse
 * Fails closed - rejects invalid input without processing
 */
export function validateParams(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.params);
    
    if (!result.success) {
      return res.status(400).json({
        error: 'Parameter validation failed',
        details: result.error.errors
      });
    }
    
    // Replace params with validated data
    req.params = result.data;
    next();
  };
}
