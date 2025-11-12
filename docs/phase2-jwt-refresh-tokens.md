# JWT Refresh Token Rotation Implementation

## Overview

Implemented rotating refresh tokens with automatic reuse detection and token family tracking. This significantly enhances authentication security by:

- Reducing the attack surface with short-lived access tokens (15 minutes)
- Detecting and mitigating stolen refresh tokens
- Tracking all active sessions with metadata
- Providing secure logout from single or all devices

---

## Architecture

### Token Types

**Access Token:**
- Lifespan: 15 minutes
- Used for API authentication
- Stored in memory/localStorage (client)
- Cannot be revoked (expires quickly)

**Refresh Token:**
- Lifespan: 14 days
- Used to obtain new access tokens
- Stored hashed in database
- Can be revoked immediately
- Tracked with IP address and user agent

### Token Family Concept

Each login creates a new "token family" (UUID). When a refresh token is rotated:
1. Old token is marked as "replaced" with reference to new token
2. New token inherits the same family ID
3. If a replaced token is reused → entire family is revoked (security breach detected)

---

## Database Schema

### refreshTokens Table

```typescript
{
  id: number,
  userId: number,           // Foreign key to users
  token: string,            // SHA-256 hash of the JWT
  tokenFamily: string,      // UUID for rotation tracking
  expiresAt: Date,
  revokedAt: Date | null,   // NULL = active, non-NULL = revoked
  replacedBy: string | null,// Token ID that replaced this one
  createdAt: Date,
  ipAddress: string | null, // Client IP for security tracking
  userAgent: string | null  // Client user agent
}
```

**Migration:** `drizzle/0016_melodic_killraven.sql`

---

## API Endpoints

### POST /api/auth/login

**Request:**
```json
{
  "username": "rommel",
  "password": "password123"
}
```

**Response:**
```json
{
  "accessToken": "eyJ...",
  "refreshToken": "eyJ...",
  "token": "eyJ...",  // Backward compatibility
  "user": {
    "id": 1,
    "username": "rommel",
    "role": "admin"
  }
}
```

**Behavior:**
- Creates new token family
- Stores hashed refresh token in database
- Tracks IP address and user agent

### POST /api/auth/refresh

**Request:**
```json
{
  "refreshToken": "eyJ..."
}
```

**Response:**
```json
{
  "accessToken": "eyJ...",  // New 15-minute token
  "refreshToken": "eyJ...", // New 14-day token (rotated)
  "token": "eyJ..."         // Backward compatibility
}
```

**Behavior:**
1. Verify refresh token JWT signature
2. Check if token exists in database (not revoked)
3. **CRITICAL:** Check if token was already used (replacedBy is set)
   - If yes → revoke entire token family (security breach)
   - If no → continue
4. Generate new access + refresh tokens
5. Mark old refresh token as replaced
6. Return new tokens

**Security:**
- Reuse detection prevents token theft
- IP address and user agent logged for each rotation
- Entire family revoked if replay attack detected

### POST /api/auth/logout

**Request:**
```json
{
  "refreshToken": "eyJ..."
}
```

**Response:**
```json
{
  "message": "Logged out successfully"
}
```

**Behavior:**
- Revokes the specific refresh token
- Access token continues working until expiration (15 min max)

### POST /api/auth/logout-all

**Request:** (Requires authentication header)
```
Authorization: Bearer <accessToken>
```

**Response:**
```json
{
  "message": "Logged out from all devices successfully"
}
```

**Behavior:**
- Revokes ALL refresh tokens for the authenticated user
- Useful for "logout from all devices" feature

---

## Client-Side Usage

### Token Storage

```typescript
import { storeTokens, getAccessToken, clearTokens } from '@/lib/token-refresh';

// After login
storeTokens(data.accessToken, data.refreshToken);

// Get current access token
const token = getAccessToken();

// Logout
clearTokens();
```

### Automatic Token Refresh

```typescript
import { fetchWithTokenRefresh } from '@/lib/token-refresh';

// This wrapper automatically refreshes expired tokens
const response = await fetchWithTokenRefresh('/api/cycles', {
  method: 'GET'
});
```

**How it works:**
1. Makes request with current access token
2. If 401 Unauthorized → calls `/auth/refresh`
3. Retries original request with new access token
4. If refresh fails → redirects to login

### Proactive Token Refresh

```typescript
import { ensureValidToken } from '@/lib/token-refresh';

// Before critical operations, ensure token is valid
await ensureValidToken();
```

Checks if token expires within 1 minute and proactively refreshes it.

---

## Security Features

### 1. Token Reuse Detection

If a refresh token that was already replaced is used again:
```
🚨 SECURITY ALERT: Refresh token reuse detected! 
Token family: uuid-xxx, User: 5
```

**Action taken:**
- Revoke entire token family (all related tokens)
- Log security event with IP and user agent
- Return 401 Unauthorized
- User must re-authenticate

**Attack scenario prevented:**
- Attacker steals refresh token
- Legitimate user rotates token
- Attacker tries to use old (stolen) token
- System detects reuse and revokes all tokens
- Attacker loses access, user must re-login

### 2. Token Storage Security

**Server-side:**
- Tokens stored as SHA-256 hashes (not plaintext)
- Database breach doesn't expose usable tokens

**Client-side:**
- Refresh tokens in localStorage (XSS risk mitigated by short access token lifespan)
- Future enhancement: HTTP-only cookies

### 3. Metadata Tracking

Each token rotation captures:
- IP address (detects geographic anomalies)
- User agent (detects device changes)
- Timestamp (audit trail)

### 4. Automatic Cleanup

```typescript
import { cleanupExpiredTokens } from '@/services/token-service';

// Run daily via cron job
const deleted = await cleanupExpiredTokens();
console.log(`Cleaned up ${deleted} expired tokens`);
```

---

## Configuration

### Environment Variables

```bash
# .env (API)
JWT_SECRET=<your-secret-key>              # Access token secret
JWT_REFRESH_SECRET=<your-refresh-secret>  # Refresh token secret (separate)
```

**Important:**
- Use different secrets for access and refresh tokens
- Rotate secrets periodically
- Never commit secrets to git

### Token Lifespans

Edit `apps/api/src/lib/jwt.ts`:

```typescript
const ACCESS_TOKEN_EXPIRY = '15m';   // Default: 15 minutes
const REFRESH_TOKEN_EXPIRY = '14d';  // Default: 14 days
```

**Recommendations:**
- Access token: 5-30 minutes (balance UX vs security)
- Refresh token: 7-30 days (match session length requirements)

---

## Backward Compatibility

The system maintains backward compatibility:

1. **Legacy `token` field:**
   - Login response includes both `accessToken` and `token` (same value)
   - Existing clients using `token` continue working

2. **Legacy JWT functions:**
   - `signToken()` → calls `signAccessToken()`
   - `verifyToken()` → calls `verifyAccessToken()`

3. **No breaking changes:**
   - Existing frontend code works without modification
   - Can gradually migrate to new refresh token flow

---

## Migration from Legacy Auth

### Step 1: Deploy Backend

```bash
cd apps/api
pnpm db:migrate  # Apply refresh tokens table
pnpm build
pnpm start
```

### Step 2: Update Frontend (Gradual)

**Option A - Full Migration:**
```typescript
// Update login flow
const { accessToken, refreshToken } = await login(username, password);
storeTokens(accessToken, refreshToken);

// Use automatic refresh wrapper
const data = await fetchWithTokenRefresh('/api/cycles');
```

**Option B - Keep Existing (Short Term):**
```typescript
// Existing code continues working
const { token } = await login(username, password);
localStorage.setItem('token', token);

// Access token expires in 15 minutes instead of 24 hours
// Users must re-login more frequently (acceptable short-term)
```

---

## Monitoring & Alerts

### Security Events to Monitor

1. **Token reuse attempts:**
   ```
   🚨 SECURITY: Token reuse detected
   ```
   - Alert security team
   - Review user account for compromise

2. **High refresh rate:**
   - User refreshing token every minute
   - Possible automated attack
   - Consider rate limiting

3. **Geographic anomalies:**
   - Token used from different countries within minutes
   - Possible account sharing or compromise

### Metrics to Track

- Refresh token rotations per day
- Average token family lifespan
- Token reuse detection events
- Failed refresh attempts
- Active sessions per user

---

## Testing

### Manual Testing

1. **Login and refresh:**
   ```bash
   # Login
   curl -X POST http://localhost:2020/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{"username":"rommel","password":"password"}'
   
   # Refresh
   curl -X POST http://localhost:2020/api/auth/refresh \
     -H "Content-Type: application/json" \
     -d '{"refreshToken":"<refreshToken>"}'
   ```

2. **Test reuse detection:**
   - Get refresh token from login
   - Call /refresh (token rotated)
   - Call /refresh again with old token
   - Should receive 401 + security alert

3. **Test logout:**
   ```bash
   curl -X POST http://localhost:2020/api/auth/logout \
     -H "Content-Type: application/json" \
     -d '{"refreshToken":"<refreshToken>"}'
   ```

### Automated Testing

See `docs/phase2-testing.md` for unit and integration tests.

---

## Troubleshooting

### "Invalid or expired refresh token"

**Causes:**
- Token expired (>14 days old)
- Token was revoked (logout)
- Token was reused (security event)
- JWT signature invalid

**Solution:**
- User must re-login
- Check server logs for reuse detection

### "Token reuse detected. All tokens in this family have been revoked"

**Cause:**
- Refresh token that was already rotated was used again
- Possible stolen token or client-side bug

**Solution:**
- User must re-login
- Review security logs for compromise
- Check client code for duplicate refresh calls

### Tokens not being stored

**Cause:**
- localStorage disabled (private browsing)
- Client not calling `storeTokens()`

**Solution:**
- Implement fallback to memory storage
- Check browser console for errors

---

## Future Enhancements

1. **HTTP-only cookies:**
   - Store refresh token in HTTP-only cookie (prevents XSS)
   - Keep access token in memory only

2. **Device management UI:**
   - Show user all active sessions
   - Allow revoking specific devices

3. **Suspicious activity detection:**
   - Geographic anomalies
   - Rapid IP changes
   - Unusual user agents

4. **Refresh token rotation limit:**
   - Prevent infinite rotation chains
   - Require re-authentication after N rotations

5. **Rate limiting:**
   - Limit refresh endpoint to prevent abuse
   - Exponential backoff on failed attempts

---

## References

- [OAuth 2.0 Refresh Token Rotation](https://auth0.com/docs/secure/tokens/refresh-tokens/refresh-token-rotation)
- [OWASP JWT Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/JSON_Web_Token_for_Java_Cheat_Sheet.html)
- [RFC 6749 - OAuth 2.0](https://datatracker.ietf.org/doc/html/rfc6749)


