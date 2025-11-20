# ngrok Security Checklist for VSol Admin

## Critical Security Items for Public Internet Access

### 1. Environment Variables ✅ REQUIRED

**`apps/api/.env` must have:**
```env
# REQUIRED: Strong JWT secret (at least 32 characters, random)
JWT_SECRET=your-very-long-random-secret-key-minimum-32-characters

# REQUIRED: Set CORS_ORIGIN to your web ngrok URL
CORS_ORIGIN=https://your-web-ngrok-url.ngrok-free.app

# OPTIONAL but RECOMMENDED: Enable database encryption
SQLCIPHER_ENABLED=true

# OPTIONAL: Set NODE_ENV to production for stricter security
NODE_ENV=production
```

**`apps/web/.env` must have:**
```env
# REQUIRED: Set to your API ngrok URL
VITE_API_URL=https://your-api-ngrok-url.ngrok-free.app/api
```

### 2. JWT Secret Security ✅ CRITICAL

**Current Status:** ✅ Fixed - Application throws error if JWT_SECRET not set

**Action Required:**
- Generate a strong random secret (minimum 32 characters)
- Use a password manager or: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
- Never commit `.env` files to git
- Rotate JWT_SECRET if it was ever committed or exposed

### 3. Database Encryption ✅ RECOMMENDED

**For production data, enable SQLCipher encryption:**

```powershell
cd apps/api
.\scripts\enable-sqlcipher.ps1
```

This will:
- Generate a secure 256-bit encryption key
- Store it in Windows Credential Manager
- Encrypt your database

**Verify encryption:**
```powershell
# This should fail (database is encrypted)
sqlite3 apps/api/dev.db "SELECT * FROM users;"
```

### 4. CORS Configuration ✅ VERIFIED

**Current Status:** ✅ Configured to allow ngrok domains

The application automatically allows:
- `*.ngrok.io` domains
- `*.ngrok-free.app` domains
- `*.ngrok.app` domains

**Action Required:**
- Set `CORS_ORIGIN` in `.env` to your specific web ngrok URL for stricter control
- Or use wildcard pattern: `CORS_ORIGIN=*.ngrok-free.app`

### 5. Rate Limiting ✅ IMPLEMENTED

**Current Protection:**
- General endpoints: 100 requests/15min per IP
- Authentication: 5 requests/15min per IP (prevents brute force)
- Write operations: 50 requests/15min per IP

**Status:** ✅ Active and protecting all endpoints

### 6. Security Headers ✅ IMPLEMENTED

**Current Headers:**
- Content-Security-Policy
- HSTS (HTTP Strict Transport Security)
- X-Frame-Options: DENY
- X-Content-Type-Options: nosniff
- Referrer-Policy: strict-origin-when-cross-origin

**Status:** ✅ Configured via Helmet middleware

### 7. Error Information Disclosure ✅ FIXED

**Current Status:** ✅ Error messages sanitized in production

- Stack traces never exposed in production
- Generic error messages for common errors
- Full details logged server-side only

### 8. File Upload Security ✅ IMPLEMENTED

**Current Protection:**
- Magic byte validation (prevents MIME type spoofing)
- File size limits (5MB)
- Only JPEG and PNG allowed

**Status:** ✅ Active

### 9. Password Security ✅ IMPLEMENTED

**Current Protection:**
- Argon2id hashing (stronger than bcrypt)
- Constant-time comparison (prevents timing attacks)
- Automatic rehashing from bcrypt to Argon2id

**Action Required:**
- Ensure all user passwords are strong
- Consider implementing password complexity requirements

### 10. Authentication Security ✅ IMPLEMENTED

**Current Protection:**
- JWT tokens with 15-minute expiration
- Refresh tokens with 14-day expiration
- Token rotation on refresh
- Rate limiting on login endpoint

**Status:** ✅ Active

## Additional Security Recommendations

### 11. ngrok Authentication (RECOMMENDED)

**Add ngrok authentication to prevent unauthorized access:**

```bash
# Start ngrok with basic auth
ngrok http 2020 --basic-auth="username:password"

# Or use ngrok authtoken for reserved domains
ngrok config add-authtoken YOUR_AUTH_TOKEN
```

### 12. Firewall Rules

**Ensure your laptop firewall:**
- Only allows connections to ports 2020 and 5173 from localhost
- Blocks direct external access (ngrok handles external access)

### 13. Database Backup Security

**If backing up database:**
- Encrypt backups if storing on cloud/shared drives
- Use strong passwords for backup archives
- Store backups securely (not in public locations)

### 14. Monitoring & Logging

**Monitor for:**
- Failed login attempts (check server logs)
- Rate limit violations
- Unusual API usage patterns
- Error logs for potential attacks

### 15. Regular Updates

**Keep dependencies updated:**
```bash
pnpm audit --prod
pnpm update
```

**Current Status:** 1 low severity vulnerability in deprecated `csurf` package (not critical for JWT-based auth)

### 16. Access Control

**Limit who knows your ngrok URLs:**
- Don't share ngrok URLs publicly
- Use ngrok reserved domains if you need stable URLs
- Consider IP allowlisting if ngrok supports it

### 17. HTTPS/TLS

**Status:** ✅ ngrok provides HTTPS automatically

All traffic through ngrok is encrypted via HTTPS.

### 18. Session Management

**Current Implementation:**
- JWT tokens stored in memory (frontend)
- Refresh tokens stored in database
- Automatic token rotation
- Logout revokes refresh tokens

**Status:** ✅ Secure

## Quick Security Verification

Run these checks before going live:

```bash
# 1. Verify JWT_SECRET is set and strong
# Check apps/api/.env - should be at least 32 characters

# 2. Verify CORS_ORIGIN is set
# Check apps/api/.env - should match your web ngrok URL

# 3. Test rate limiting
curl -X POST https://your-api-url.ngrok-free.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"test","password":"wrong"}' \
  -v
# Try 6 times - should get 429 after 5 attempts

# 4. Test authentication
curl https://your-api-url.ngrok-free.app/api/consultants \
  -H "Authorization: Bearer invalid-token"
# Should return 403

# 5. Verify security headers
curl -I https://your-api-url.ngrok-free.app/health
# Should see: X-Frame-Options, X-Content-Type-Options, etc.

# 6. Test error handling
curl https://your-api-url.ngrok-free.app/api/nonexistent
# Should return generic error (no stack trace)
```

## Known Vulnerabilities

### Low Severity
- `cookie@0.4.0` (via deprecated `csurf@1.11.0`)
  - **Impact:** Low - csurf is deprecated and not critical for JWT-based auth
  - **Action:** Can be ignored or remove csurf if not using CSRF protection

## Security Best Practices

1. **Never commit `.env` files** - Already in `.gitignore` ✅
2. **Use strong passwords** for all user accounts
3. **Rotate JWT_SECRET** if ever exposed
4. **Monitor logs** for suspicious activity
5. **Keep dependencies updated** regularly
6. **Backup database** regularly (encrypted)
7. **Use ngrok authentication** for additional protection
8. **Limit ngrok URL sharing** to authorized users only

## Emergency Response

If you suspect a security breach:

1. **Immediately rotate JWT_SECRET** in `.env`
2. **Revoke all refresh tokens** (restart server or use logout-all endpoint)
3. **Check audit logs** for suspicious activity
4. **Change all user passwords**
5. **Review recent database changes**
6. **Consider shutting down ngrok tunnels** temporarily

## Summary

✅ **Critical vulnerabilities fixed**
✅ **Rate limiting active**
✅ **Security headers configured**
✅ **Error messages sanitized**
✅ **File upload validation active**
✅ **Authentication secure**

⚠️ **Action Required:**
- Set strong JWT_SECRET (if not already done)
- Set CORS_ORIGIN to your ngrok URL
- Consider enabling database encryption
- Consider adding ngrok authentication

🔒 **Your application is secure for public internet access via ngrok.**

