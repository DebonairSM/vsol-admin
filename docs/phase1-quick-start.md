# Phase 1: Quick Start Guide

## Installation

### 1. Install Dependencies

```bash
pnpm install
```

### 2. Enable SQLCipher Encryption (Production)

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

### 3. Update Environment Variables

Add to `apps/api/.env`:

```bash
# Production
SQLCIPHER_ENABLED=true

# Development (if not using Windows Credential Manager)
# SQLCIPHER_KEY=<your-generated-key>
```

### 4. Start the Application

```bash
pnpm dev
```

The server will:
- Initialize the database with encryption key
- Enable WAL mode
- Automatically rehash bcrypt passwords to Argon2id on login

## Verification

### Check Database Encryption

```powershell
# Try to open database without key (should fail)
sqlite3 apps/api/dev.db "SELECT * FROM users;"
# Error: file is not a database

# Database is encrypted ✓
```

### Check Password Hashing

Look for this in server logs after login:

```
🔄 Rehashing password for user <username> (upgrading to Argon2id)
```

### Check Validation

Send invalid data to any endpoint:

```bash
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": ""}'

# Response:
# {
#   "error": "Validation failed",
#   "details": [...]
# }
```

## Troubleshooting

### "SQLCipher key not found in Windows Credential Manager"

Run the enable script:
```powershell
cd apps/api
.\scripts\enable-sqlcipher.ps1
```

Or manually store the key:
```powershell
cmdkey /generic:VSolAdmin:SQLCipherKey /user:vsol /pass:<your-key>
```

### "Failed to unlock encrypted database"

The key in Credential Manager doesn't match the database. Either:
1. Restore from backup
2. Re-run enable-sqlcipher.ps1 with the correct key

### Build Errors (better-sqlite3)

Install Visual Studio Build Tools:
```powershell
npm install --global windows-build-tools
```

Or download from: https://visualstudio.microsoft.com/downloads/

## Development Mode (No Encryption)

For development without encryption:

```bash
# apps/api/.env
SQLCIPHER_ENABLED=false
```

The app will use standard SQLite (no encryption).

## Migration from bcrypt

No action needed. Passwords automatically upgrade on next login:

1. User logs in with old bcrypt hash
2. System verifies password
3. System detects bcrypt hash
4. System rehashes with Argon2id
5. System updates database with new hash

## Security Notes

- Never commit encryption keys to git
- Never put encryption keys in .env (production)
- Keep backup of encryption key separately
- Database backups are encrypted (need key to restore)

## Next: Phase 2

Phase 2 adds:
- JWT refresh token rotation
- Optional TOTP two-factor authentication
- RBAC middleware

See `hybrid-security-infrastructure.plan.md` for details.

