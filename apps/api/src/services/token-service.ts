import { db, refreshTokens } from '../db';
import { eq, and, lt } from 'drizzle-orm';
import { signRefreshToken, verifyRefreshToken, getRefreshTokenExpiry, RefreshTokenPayload, JWTPayload, signAccessToken } from '../lib/jwt';
import crypto from 'crypto';

/**
 * Token Service handles refresh token rotation, reuse detection, and revocation
 * 
 * Security features:
 * - Automatic token rotation on refresh
 * - Reuse detection (revokes entire token family if reused)
 * - IP address and user agent tracking
 * - Automatic cleanup of expired tokens
 */

/**
 * Hash a refresh token for storage
 * We store hashed tokens to prevent token theft from database
 */
function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Generate a new token family ID (UUID v4)
 */
function generateTokenFamily(): string {
  return crypto.randomUUID();
}

/**
 * Create a new refresh token for a user
 * 
 * @param userId - User ID
 * @param userPayload - User JWT payload
 * @param ipAddress - Client IP address
 * @param userAgent - Client user agent
 * @returns Object containing both access and refresh tokens
 */
export async function createRefreshToken(
  userId: number,
  userPayload: JWTPayload,
  ipAddress?: string,
  userAgent?: string
): Promise<{ accessToken: string; refreshToken: string }> {
  
  const tokenFamily = generateTokenFamily();
  const expiresAt = getRefreshTokenExpiry();
  
  // Insert token record (we'll get the ID)
  const [tokenRecord] = await db.insert(refreshTokens).values({
    userId,
    token: '', // Temporary placeholder
    tokenFamily,
    expiresAt,
    ipAddress: ipAddress || null,
    userAgent: userAgent || null
  }).returning();
  
  // Generate JWT with token ID and family
  const refreshTokenPayload: RefreshTokenPayload = {
    ...userPayload,
    tokenFamily,
    tokenId: tokenRecord.id
  };
  
  const refreshToken = signRefreshToken(refreshTokenPayload);
  const accessToken = signAccessToken(userPayload);
  
  // Update record with hashed token
  await db.update(refreshTokens)
    .set({ token: hashToken(refreshToken) })
    .where(eq(refreshTokens.id, tokenRecord.id));
  
  return { accessToken, refreshToken };
}

/**
 * Rotate a refresh token
 * 
 * This implements the refresh token rotation pattern:
 * 1. Verify the provided refresh token
 * 2. Check if it's already been used (reuse detection)
 * 3. Generate a new refresh token in the same family
 * 4. Revoke the old token
 * 5. Return new access and refresh tokens
 * 
 * If reuse is detected (token already replaced), revoke entire family
 */
export async function rotateRefreshToken(
  refreshToken: string,
  ipAddress?: string,
  userAgent?: string
): Promise<{ accessToken: string; refreshToken: string }> {
  
  // Verify and decode the token
  let payload: RefreshTokenPayload;
  try {
    payload = verifyRefreshToken(refreshToken);
  } catch (error) {
    throw new Error('Invalid or expired refresh token');
  }
  
  // Find the token in database
  const hashedToken = hashToken(refreshToken);
  const [tokenRecord] = await db.select()
    .from(refreshTokens)
    .where(eq(refreshTokens.token, hashedToken))
    .limit(1);
  
  if (!tokenRecord) {
    throw new Error('Refresh token not found');
  }
  
  // Check if token is expired
  if (new Date() > tokenRecord.expiresAt) {
    throw new Error('Refresh token expired');
  }
  
  // Check if token has been revoked
  if (tokenRecord.revokedAt) {
    throw new Error('Refresh token has been revoked');
  }
  
  // CRITICAL: Check if token has already been used (reuse detection)
  if (tokenRecord.replacedBy) {
    console.warn(`🚨 SECURITY ALERT: Refresh token reuse detected! Token family: ${payload.tokenFamily}, User: ${payload.userId}`);
    
    // Revoke the entire token family
    await revokeTokenFamily(payload.tokenFamily);
    
    throw new Error('Token reuse detected. All tokens in this family have been revoked.');
  }
  
  // Create new token in the same family
  const expiresAt = getRefreshTokenExpiry();
  
  const [newTokenRecord] = await db.insert(refreshTokens).values({
    userId: payload.userId,
    token: '', // Temporary placeholder
    tokenFamily: payload.tokenFamily,
    expiresAt,
    ipAddress: ipAddress || null,
    userAgent: userAgent || null
  }).returning();
  
  // Generate new tokens
  const newRefreshTokenPayload: RefreshTokenPayload = {
    userId: payload.userId,
    username: payload.username,
    role: payload.role,
    tokenFamily: payload.tokenFamily,
    tokenId: newTokenRecord.id
  };
  
  const newRefreshToken = signRefreshToken(newRefreshTokenPayload);
  const newAccessToken = signAccessToken({
    userId: payload.userId,
    username: payload.username,
    role: payload.role
  });
  
  // Update new token record with hashed token
  await db.update(refreshTokens)
    .set({ token: hashToken(newRefreshToken) })
    .where(eq(refreshTokens.id, newTokenRecord.id));
  
  // Revoke old token (mark as replaced)
  await db.update(refreshTokens)
    .set({
      revokedAt: new Date(),
      replacedBy: newTokenRecord.id.toString()
    })
    .where(eq(refreshTokens.id, tokenRecord.id));
  
  return {
    accessToken: newAccessToken,
    refreshToken: newRefreshToken
  };
}

/**
 * Revoke a specific refresh token
 */
export async function revokeRefreshToken(refreshToken: string): Promise<void> {
  const hashedToken = hashToken(refreshToken);
  
  await db.update(refreshTokens)
    .set({ revokedAt: new Date() })
    .where(eq(refreshTokens.token, hashedToken));
}

/**
 * Revoke all tokens in a token family
 * Used when token reuse is detected (security breach)
 */
export async function revokeTokenFamily(tokenFamily: string): Promise<void> {
  await db.update(refreshTokens)
    .set({ revokedAt: new Date() })
    .where(
      and(
        eq(refreshTokens.tokenFamily, tokenFamily),
        eq(refreshTokens.revokedAt, null) // Only revoke non-revoked tokens
      )
    );
}

/**
 * Revoke all refresh tokens for a user
 * Used for logout from all devices
 */
export async function revokeAllUserTokens(userId: number): Promise<void> {
  await db.update(refreshTokens)
    .set({ revokedAt: new Date() })
    .where(
      and(
        eq(refreshTokens.userId, userId),
        eq(refreshTokens.revokedAt, null)
      )
    );
}

/**
 * Clean up expired refresh tokens
 * Should be run periodically (e.g., daily cron job)
 */
export async function cleanupExpiredTokens(): Promise<number> {
  const now = new Date();
  
  const expiredTokens = await db.delete(refreshTokens)
    .where(lt(refreshTokens.expiresAt, now))
    .returning();
  
  return expiredTokens.length;
}

/**
 * Get active refresh tokens for a user
 * Useful for "active sessions" display
 */
export async function getUserActiveSessions(userId: number): Promise<Array<{
  id: number;
  createdAt: Date;
  ipAddress: string | null;
  userAgent: string | null;
}>> {
  const tokens = await db.select({
    id: refreshTokens.id,
    createdAt: refreshTokens.createdAt,
    ipAddress: refreshTokens.ipAddress,
    userAgent: refreshTokens.userAgent
  })
  .from(refreshTokens)
  .where(
    and(
      eq(refreshTokens.userId, userId),
      eq(refreshTokens.revokedAt, null),
      lt(new Date(), refreshTokens.expiresAt)
    )
  );
  
  return tokens;
}

