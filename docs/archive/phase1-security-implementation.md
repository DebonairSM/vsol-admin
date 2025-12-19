# Phase 1: Core Security Foundation - Implementation Archive

**Completed:** November 1, 2025  
**Status:** Historical documentation - features are now part of the main system

This document archives the Phase 1 security implementation that established core security foundations for the Company Portal application.

## Overview

Phase 1 implemented three critical security enhancements:

1. SQLCipher database encryption with Windows Credential Manager
2. Argon2id password hashing (replacing bcryptjs)
3. Enhanced Zod validation with safeParse pattern

---

## 1. Database Encryption (SQLCipher)

### Implementation

**Files Created:**
- `apps/api/src/lib/credential-manager.ts` - Windows Credential Manager integration
- `apps/api/scripts/enable-sqlcipher.ps1` - Database encryption migration script

**Files Modified:**
- `apps/api/package.json` - Added SQLCipher dependencies
- `apps/api/src/db/index.ts` - Switched to better-sqlite3 with SQLCipher support
- `apps/api/src/server.ts` - Added database initialization on startup

### Features

**Encryption Key Management:**
- Encryption keys stored securely in Windows Credential Manager
- Target: `VSolAdmin:SQLCipherKey`
- No keys in `.env` files (production)
- Development fallback to `SQLCIPHER_KEY` environment variable

**Database Configuration:**
- WAL (Write-Ahead Logging) mode enabled for better concurrency
- Foreign keys enabled
- 256-bit AES encryption (32-byte hex key)
- Automatic key verification on database connection

**Migration Process:**
1. Generate secure random key (256 bits)
2. Store key in Windows Credential Manager
3. Backup original unencrypted database
4. Create encrypted copy using SQLCipher
5. Replace original with encrypted version

### Usage

**Enable Encryption:**
```powershell
cd apps/api
.\scripts\enable-sqlcipher.ps1
```

**Environment Variable:**
```bash
SQLCIPHER_ENABLED=true  # Set this in .env to enable encryption
```

**Manual Key Storage:**
```powershell
cmdkey /generic:VSolAdmin:SQLCipherKey /user:vsol /pass:<your-key>
```

### Security Benefits

- Database encrypted at rest (protection against file theft)
- Keys stored separately from database (not in repository)
- Windows Credential Manager provides OS-level security
- Backward compatible (can run unencrypted in development)

---

## 2. Argon2id Password Hashing

### Implementation

**Files Created:**
- `apps/api/src/lib/password.ts` - Argon2id password hashing module

**Files Modified:**
- `apps/api/package.json` - Replaced `bcryptjs` with `argon2`
- `apps/api/src/routes/auth.ts` - Updated to use Argon2id with automatic rehashing
- `apps/api/src/db/seed.ts` - Updated to use new password module

**Files Deleted:**
- `apps/api/src/lib/bcrypt.ts` - Replaced by password.ts

### Features

**Argon2id Configuration (OWASP Recommendations):**
- Type: Argon2id (hybrid of Argon2i and Argon2d)
- Memory cost: 65536 KB (64 MB)
- Time cost: 3 iterations
- Parallelism: 4 threads
- Hash length: 32 bytes (256 bits)

**Backward Compatibility:**
- Automatic detection of bcrypt hashes
- Transparent bcrypt verification for legacy passwords
- Automatic rehashing on next login (bcrypt → Argon2id)
- `needsRehash()` function to check if upgrade needed

**Functions:**
- `hashPassword(password)` - Hash password with Argon2id
- `comparePassword(password, hash)` - Verify password (supports bcrypt legacy)
- `needsRehash(hash)` - Check if hash should be upgraded

### Usage

```typescript
import { hashPassword, comparePassword, needsRehash } from '../lib/password';

// Hash a new password
const hash = await hashPassword('mySecurePassword123');

// Verify password
const isValid = await comparePassword('myPassword', storedHash);

// Check if needs rehashing
if (needsRehash(user.passwordHash)) {
  const newHash = await hashPassword(password);
  // Update user record
}
```

### Security Benefits

- Stronger resistance to GPU-based attacks
- Memory-hard algorithm prevents ASIC/FPGA attacks
- OWASP recommended parameters
- Automatic migration from weaker bcrypt hashes
- Side-channel attack resistance

---

## 3. Enhanced Zod Validation

### Implementation

**Files Modified:**
- `apps/api/src/middleware/validate.ts` - Updated to use `safeParse`

### Features

**Validation Middleware:**
- `validateBody(schema)` - Validate request body
- `validateQuery(schema)` - Validate query parameters
- `validateParams(schema)` - Validate route parameters

**Fail-Closed Pattern:**
```typescript
const result = schema.safeParse(req.body);
if (!result.success) {
  return res.status(400).json({
    error: 'Validation failed',
    details: result.error.errors
  });
}
req.body = result.data; // Use validated data only
```

**Coverage:**
- All 11 route files use validation middleware
- 30+ validation checkpoints across the API
- Comprehensive schemas in `packages/shared/src/schemas.ts`

### Security Benefits

- Fail-closed design (reject invalid input immediately)
- No processing of untrusted input
- Type-safe validated data
- Detailed error messages for debugging
- Protection against injection attacks

---

## Quick Start Guide

### Installation

1. **Install Dependencies:**
   ```bash
   pnpm install
   ```

2. **Enable SQLCipher Encryption (Production):**
   ```powershell
   cd apps/api
   .\scripts\enable-sqlcipher.ps1
   ```
   
   This script will:
   - Generate a secure 256-bit encryption key
   - Store it in Windows Credential Manager
   - Backup your existing database
   - Create an encrypted copy
   - Replace the original database

3. **Update Environment Variables:**
   
   Add to `apps/api/.env`:
   ```bash
   # Production
   SQLCIPHER_ENABLED=true
   
   # Development (if not using Windows Credential Manager)
   # SQLCIPHER_KEY=<your-generated-key>
   ```

4. **Start the Application:**
   ```bash
   pnpm dev
   ```
   
   The server will:
   - Initialize the database with encryption key
   - Enable WAL mode
   - Automatically rehash bcrypt passwords to Argon2id on login

### Verification

**Check Database Encryption:**
```powershell
# Try to open database without key (should fail)
sqlite3 apps/api/dev.db "SELECT * FROM users;"
# Error: file is not a database

# Database is encrypted ✓
```

**Check Password Hashing:**
Look for this in server logs after login:
```
🔄 Rehashing password for user <username> (upgrading to Argon2id)
```

**Check Validation:**
Send invalid data to any endpoint:
```bash
curl -X POST http://localhost:2020/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": ""}'

# Response:
# {
#   "error": "Validation failed",
#   "details": [...]
# }
```

### Troubleshooting

**"SQLCipher key not found in Windows Credential Manager"**

Run the enable script:
```powershell
cd apps/api
.\scripts\enable-sqlcipher.ps1
```

Or manually store the key:
```powershell
cmdkey /generic:VSolAdmin:SQLCipherKey /user:vsol /pass:<your-key>
```

**"Failed to unlock encrypted database"**

The key in Credential Manager doesn't match the database. Either:
1. Restore from backup
2. Re-run enable-sqlcipher.ps1 with the correct key

**Build Errors (better-sqlite3)**

Install Visual Studio Build Tools:
```powershell
npm install --global windows-build-tools
```

Or download from: https://visualstudio.microsoft.com/downloads/

### Development Mode (No Encryption)

For development without encryption:
```bash
# apps/api/.env
SQLCIPHER_ENABLED=false
```

The app will use standard SQLite (no encryption).

### Migration from bcrypt

No action needed. Passwords automatically upgrade on next login:

1. User logs in with old bcrypt hash
2. System verifies password
3. System detects bcrypt hash
4. System rehashes with Argon2id
5. System updates database with new hash

---

## Dependencies Added

```json
{
  "dependencies": {
    "@journeyapps/sqlcipher": "^5.3.1",
    "argon2": "^0.31.2",
    "better-sqlite3": "^12.4.1",
    "node-windows-cred-manager": "^1.0.2"
  }
}
```

## Dependencies Removed

```json
{
  "dependencies": {
    "bcryptjs": "^2.4.3"  // Replaced by argon2
  },
  "devDependencies": {
    "@types/bcryptjs": "^2.4.6"  // No longer needed
  }
}
```

---

## Testing Checklist

- [x] SQLCipher encryption enabled and database accessible
- [x] Windows Credential Manager stores key correctly
- [x] Database WAL mode active
- [x] Argon2id hashing for new passwords
- [x] Bcrypt password verification (backward compatibility)
- [x] Automatic password rehashing on login
- [x] Zod validation rejects invalid input
- [x] All API routes use validation middleware
- [x] Error messages returned on validation failure

---

## Security Posture Improvements

| Metric | Before Phase 1 | After Phase 1 |
|--------|----------------|---------------|
| Database encryption | None | AES-256 (SQLCipher) |
| Password hashing | bcrypt (10 rounds) | Argon2id (64MB, 3 iter) |
| Input validation | Exception-based | Fail-closed safeParse |
| Key storage | N/A | Windows Credential Manager |
| Legacy migration | N/A | Automatic rehashing |

---

## Known Limitations

1. **SQLCipher on Windows:**
   - Requires native compilation (better-sqlite3 dependency)
   - May need Visual Studio Build Tools on some systems

2. **Credential Manager:**
   - Windows-only solution
   - For Linux/Mac, key must be in environment variable
   - Future: Add cross-platform secret storage

3. **Performance:**
   - Argon2id is intentionally slow (security feature)
   - ~100-200ms per password hash/verify
   - Not an issue for authentication flows

---

## References

- [OWASP Password Storage Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html)
- [Argon2 RFC 9106](https://www.rfc-editor.org/rfc/rfc9106.html)
- [SQLCipher Documentation](https://www.zetetic.net/sqlcipher/)
- [Zod Documentation](https://zod.dev/)

---

## Security Notes

- Never commit encryption keys to git
- Never put encryption keys in .env (production)
- Keep backup of encryption key separately
- Database backups are encrypted (need key to restore)








