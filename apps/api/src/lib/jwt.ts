import jwt from 'jsonwebtoken';

// Validate JWT secrets are configured - throw error if missing
if (!process.env.JWT_SECRET) {
  throw new Error(
    'JWT_SECRET environment variable is required. ' +
    'Please set it to a secure random string (at least 32 characters).'
  );
}

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || JWT_SECRET;

// Token expiration times
const ACCESS_TOKEN_EXPIRY = '15m';  // 15 minutes
const REFRESH_TOKEN_EXPIRY = '14d';  // 14 days

export interface JWTPayload {
  userId: number;
  username: string;
  role: string;
}

export interface RefreshTokenPayload extends JWTPayload {
  tokenFamily: string; // UUID for token rotation tracking
  tokenId: number;     // Database ID for revocation
}

/**
 * Generate a short-lived access token (15 minutes)
 * Used for API authentication
 */
export function signAccessToken(payload: JWTPayload): string {
  return jwt.sign(
    {
      ...payload,
      type: 'access',
      aud: 'vsol-admin-api',
      iss: 'vsol-admin'
    },
    JWT_SECRET,
    { expiresIn: ACCESS_TOKEN_EXPIRY }
  );
}

/**
 * Generate a long-lived refresh token (14 days)
 * Used to obtain new access tokens
 */
export function signRefreshToken(payload: RefreshTokenPayload): string {
  return jwt.sign(
    {
      ...payload,
      type: 'refresh',
      aud: 'vsol-admin-api',
      iss: 'vsol-admin'
    },
    JWT_REFRESH_SECRET,
    { expiresIn: REFRESH_TOKEN_EXPIRY }
  );
}

/**
 * Verify an access token
 */
export function verifyAccessToken(token: string): JWTPayload {
  const payload = jwt.verify(token, JWT_SECRET, {
    audience: 'vsol-admin-api',
    issuer: 'vsol-admin'
  }) as any;
  
  if (payload.type !== 'access') {
    throw new Error('Invalid token type');
  }
  
  return {
    userId: payload.userId,
    username: payload.username,
    role: payload.role
  };
}

/**
 * Verify a refresh token
 */
export function verifyRefreshToken(token: string): RefreshTokenPayload {
  const payload = jwt.verify(token, JWT_REFRESH_SECRET, {
    audience: 'vsol-admin-api',
    issuer: 'vsol-admin'
  }) as any;
  
  if (payload.type !== 'refresh') {
    throw new Error('Invalid token type');
  }
  
  return {
    userId: payload.userId,
    username: payload.username,
    role: payload.role,
    tokenFamily: payload.tokenFamily,
    tokenId: payload.tokenId
  };
}

/**
 * Legacy function for backward compatibility
 * @deprecated Use signAccessToken instead
 */
export function signToken(payload: JWTPayload): string {
  return signAccessToken(payload);
}

/**
 * Legacy function for backward compatibility
 * @deprecated Use verifyAccessToken instead
 */
export function verifyToken(token: string): JWTPayload {
  return verifyAccessToken(token);
}

/**
 * Calculate expiration timestamp for refresh token
 */
export function getRefreshTokenExpiry(): Date {
  const expiry = new Date();
  expiry.setDate(expiry.getDate() + 14); // 14 days
  return expiry;
}
