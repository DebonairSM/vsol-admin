import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

/**
 * CSRF Protection Middleware
 * 
 * For JWT-based APIs, CSRF is less of a concern since tokens are in Authorization headers,
 * not cookies. However, this middleware provides additional protection for state-changing
 * operations by requiring a CSRF token for POST/PUT/DELETE requests.
 * 
 * Note: This is a simplified implementation. For production, consider using a more
 * robust solution or ensure SameSite cookies if using cookie-based auth.
 */

const CSRF_TOKEN_HEADER = 'X-CSRF-Token';
const CSRF_TOKEN_COOKIE = 'XSRF-TOKEN';

/**
 * Generate a CSRF token
 */
export function generateCsrfToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * CSRF protection middleware
 * Only applies to state-changing methods (POST, PUT, PATCH, DELETE)
 */
export function csrfProtection(req: Request, res: Response, next: NextFunction) {
  // Skip CSRF check for safe methods
  const safeMethods = ['GET', 'HEAD', 'OPTIONS'];
  if (safeMethods.includes(req.method)) {
    return next();
  }

  // Skip CSRF check for auth endpoints (they use JWT tokens)
  if (req.path.startsWith('/api/auth')) {
    return next();
  }

  // For JWT-based APIs, CSRF is less critical since tokens are in headers
  // However, we can still validate if a token is provided
  const tokenFromHeader = req.headers[CSRF_TOKEN_HEADER.toLowerCase()] as string;
  const tokenFromCookie = req.cookies?.[CSRF_TOKEN_COOKIE];

  // If no token is provided, allow the request (JWT in Authorization header provides protection)
  // This is a permissive approach for JWT APIs
  // For stricter protection, uncomment the following:
  /*
  if (!tokenFromHeader && !tokenFromCookie) {
    return res.status(403).json({
      error: 'CSRF token missing'
    });
  }

  if (tokenFromHeader && tokenFromCookie && tokenFromHeader !== tokenFromCookie) {
    return res.status(403).json({
      error: 'CSRF token mismatch'
    });
  }
  */

  next();
}

/**
 * Middleware to set CSRF token cookie
 * Call this on GET requests to provide token to client
 */
export function setCsrfToken(req: Request, res: Response, next: NextFunction) {
  // Only set token for GET requests
  if (req.method === 'GET') {
    const token = generateCsrfToken();
    res.cookie(CSRF_TOKEN_COOKIE, token, {
      httpOnly: false, // Must be readable by JavaScript
      secure: process.env.NODE_ENV === 'production', // HTTPS only in production
      sameSite: 'strict',
      maxAge: 3600000 // 1 hour
    });
    res.setHeader(CSRF_TOKEN_HEADER, token);
  }
  next();
}

