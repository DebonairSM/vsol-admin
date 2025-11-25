# Database Restore Summary

## Date: 2025-01-XX (Run `Get-Date` to get current date)

## Restore Process

### 1. Database Restored
- **Source**: `C:\Users\romme\OneDrive\Documents\backups\VSolAdmin\vsol-admin-dev-2025-11-25_05-00-00-955Z.db`
- **Destination**: `C:\git\vsol-admin\apps\api\dev.db`
- **File Size**: 110,592 bytes
- **Status**: ✅ Successfully copied

### 2. Next Steps

#### A. Install Dependencies
If this is a new machine, you need to install dependencies:
```powershell
cd C:\git\vsol-admin
pnpm install
```

If `pnpm` is not installed, install it first:
```powershell
npm install -g pnpm
```

#### B. Run Database Migrations
To ensure the database schema is up to date:
```powershell
cd C:\git\vsol-admin
pnpm db:migrate
```

Or manually:
```powershell
cd apps\api
tsx scripts/safe-migrate.ts
```

#### C. Environment Variables
✅ Environment files have been created with default values. Please update them:

**IMPORTANT:** Update `JWT_SECRET` in `apps/api/.env` to a secure random string (minimum 32 characters) before starting the application.

**`apps/api/.env`** (required):
```env
PORT=2020
JWT_SECRET=<your-secret-key-min-32-chars>
DATABASE_URL=file:./dev.db
```

If using SQLCipher encryption:
```env
SQLCIPHER_ENABLED=true
SQLCIPHER_KEY=<your-encryption-key>
```

**`apps/web/.env`** (required):
```env
VITE_API_URL=http://localhost:2020/api
```

#### D. Verify Database Integrity
```powershell
cd apps\api
# If sqlite3 CLI is available:
sqlite3 dev.db "PRAGMA integrity_check;"
# Should return: ok
```

#### E. Start the Application
```powershell
cd C:\git\vsol-admin
pnpm dev
```

### 3. Available Backups
The following backup files are available in the OneDrive backup directory:
- `vsol-admin-dev-2025-11-24_21-00-00-720Z.db`
- `vsol-admin-dev-2025-11-24_22-00-00-203Z.db`
- `vsol-admin-dev-2025-11-24_23-00-00-799Z.db`
- `vsol-admin-dev-2025-11-24_23-23-38-464Z.db`
- `vsol-admin-dev-2025-11-25_00-00-00-678Z.db`
- `vsol-admin-dev-2025-11-25_01-00-00-602Z.db`
- `vsol-admin-dev-2025-11-25_02-00-00-944Z.db`
- `vsol-admin-dev-2025-11-25_03-00-00-730Z.db`
- `vsol-admin-dev-2025-11-25_04-00-00-923Z.db`
- **`vsol-admin-dev-2025-11-25_05-00-00-955Z.db`** ← **RESTORED**

### 4. Restore Verification Checklist

- [ ] Database file exists at `apps/api/dev.db`
- [ ] Dependencies installed (`pnpm install`)
- [ ] Environment variables configured (`.env` files)
- [ ] Database migrations run (`pnpm db:migrate`)
- [ ] Database integrity verified
- [ ] Application starts successfully (`pnpm dev`)
- [ ] Can login to the application
- [ ] Data is visible (consultants, cycles, etc.)

### 5. Troubleshooting

**Database file not found:**
- Verify the file exists: `Test-Path "apps\api\dev.db"`
- If missing, restore again from backup

**Migrations fail:**
- Check that dependencies are installed
- Verify database file is not corrupted
- Check database integrity with PRAGMA integrity_check

**Application won't start:**
- Check `.env` files exist and have correct values
- Verify JWT_SECRET is set (minimum 32 characters)
- Check that no other process is using the port

**Database is encrypted error:**
- If using SQLCipher, ensure encryption key is configured
- Check Windows Credential Manager for the key
- Or set SQLCIPHER_KEY in `.env` file

### 6. Additional Notes

- The database was restored from the most recent backup available
- All previous backup files remain in the OneDrive backup directory
- The restore process does not affect the backup files
- Always stop the server before restoring the database

