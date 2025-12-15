import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';

/**
 * Helper function to check if request is from localhost or local network
 * Rate limiting is more lenient for local-first applications
 */
function isLocalRequest(req: Request): boolean {
  const ip = req.ip || req.socket.remoteAddress || '';
  const hostname = req.hostname;
  
  // Check if IP is localhost
  if (ip === '127.0.0.1' || ip === '::1' || ip === '::ffff:127.0.0.1') {
    return true;
  }
  
  // Check if hostname is localhost
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return true;
  }
  
  // Check if IP is in local network ranges (192.168.x.x, 10.x.x.x, 172.16-31.x.x)
  if (typeof ip === 'string') {
    if (ip.startsWith('192.168.') || ip.startsWith('10.') || ip.match(/^172\.(1[6-9]|2[0-9]|3[0-1])\./)) {
      return true;
    }
  }
  
  return false;
}

/**
 * General rate limiter for all API endpoints
 * Limits: 1000 requests per 15 minutes per IP (local) or 100 requests (remote)
 * More lenient for local-first applications
 */
export const generalRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: (req: Request) => {
    // More lenient limits for local requests
    return isLocalRequest(req) ? 1000 : 100;
  },
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      error: 'Too many requests from this IP, please try again later.'
    });
  }
});

/**
 * Strict rate limiter for authentication endpoints
 * Limits: 10 requests per 15 minutes per IP (local) or 5 requests (remote)
 * Prevents brute force attacks while allowing reasonable local usage
 */
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: (req: Request) => {
    // Slightly more lenient for local requests, but still strict
    return isLocalRequest(req) ? 10 : 5;
  },
  message: 'Too many login attempts, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Don't count successful requests
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      error: 'Too many login attempts from this IP, please try again in 15 minutes.'
    });
  }
});

/**
 * Moderate rate limiter for write operations (POST, PUT, DELETE)
 * Limits: 200 requests per 15 minutes per IP (local) or 50 requests (remote)
 * More lenient for local-first applications where users actively edit data
 */
export const writeRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: (req: Request) => {
    // More lenient limits for local requests
    return isLocalRequest(req) ? 200 : 50;
  },
  message: 'Too many write requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      error: 'Too many write requests from this IP, please try again later.'
    });
  }
});

