import { Request, Response, NextFunction } from 'express';

export class AppError extends Error {
  public statusCode: number;
  public isOperational: boolean;
  public details?: unknown;

  constructor(message: string, statusCode: number, details?: unknown) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    this.details = details;

    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, 400, details);
  }
}

export class NotFoundError extends AppError {
  constructor(message: string) {
    super(message, 404);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string) {
    super(message, 401);
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string) {
    super(message, 403);
  }
}

/**
 * Sanitize error message to prevent information disclosure
 * Removes sensitive paths, stack traces, and internal details
 */
function sanitizeErrorMessage(error: Error, isDevelopment: boolean): string {
  let message = error.message;
  
  // In production, never expose internal error details
  if (!isDevelopment) {
    // Remove file paths (common in stack traces)
    message = message.replace(/\/[^\s]+/g, '[path]');
    
    // Remove line numbers
    message = message.replace(/:\d+:\d+/g, '');
    
    // Remove stack trace indicators
    message = message.replace(/at\s+.*/g, '');
    
    // Generic messages for common errors
    if (message.includes('ENOENT') || message.includes('not found')) {
      return 'Resource not found';
    }
    if (message.includes('EACCES') || message.includes('permission')) {
      return 'Permission denied';
    }
    if (message.includes('database') || message.includes('SQL')) {
      return 'Database error occurred';
    }
    if (message.includes('JWT') || message.includes('token')) {
      return 'Authentication error';
    }
    
    // Limit message length to prevent information leakage
    if (message.length > 200) {
      message = message.substring(0, 200) + '...';
    }
  }
  
  return message;
}

export function errorHandler(
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
) {
  const isDevelopment = process.env.NODE_ENV === 'development';
  let statusCode = 500;
  let message = 'Internal server error';

  if (error instanceof AppError) {
    statusCode = error.statusCode;
    message = error.message;
  } else {
    // For non-AppError errors, sanitize the message in production
    message = sanitizeErrorMessage(error, isDevelopment);
  }

  // Log error details server-side (never expose to client)
  // Keep stacks for 5xx/unexpected errors; avoid noisy stacks for expected 4xx validation errors.
  const logPayload = {
    message: error.message,
    url: req.url,
    method: req.method,
    userId: req.user?.userId,
    ip: req.socket.remoteAddress
  };

  const shouldLogStack =
    !(error instanceof AppError) ||
    (error instanceof AppError && error.statusCode >= 500);

  if (shouldLogStack) {
    console.error('Error:', { ...logPayload, stack: error.stack });
  } else {
    console.warn('Request rejected:', logPayload);
  }

  // SECURITY: Never expose stack traces or sensitive details to clients
  const response: { error: string; details?: any } = {
    error: message
  };
  
  // Include safe, explicit details for operational errors (e.g., validation)
  if (error instanceof AppError && error.details !== undefined) {
    response.details = error.details;
  }
  
  // Never include stack traces in production
  if (isDevelopment && error.stack) {
    response.details = {
      ...(response.details ?? {}),
      stack: error.stack.split('\n').slice(0, 5) // Limit stack trace lines
    };
  }

  res.status(statusCode).json(response);
}
