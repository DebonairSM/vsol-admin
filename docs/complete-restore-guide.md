# Complete Application Restore Guide

This guide explains how to restore the Company Portal application to a specific time point on a new laptop using files from OneDrive.

## What Gets Restored

### ✅ **100% Restored** (if all files are copied):
- All database data (consultants, cycles, line items, invoices, payments, audit logs)
- All uploaded files (consultant photos, documents)
- Application code and configuration
- Backup files

### ⚠️ **Requires Manual Setup**:
- Node.js dependencies (must run `pnpm install`)
- Environment variables (`.env` files)
- Database encryption keys (if using SQLCipher)
- Windows Credential Manager entries (if using SQLCipher)

## Files to Copy from OneDrive

### Critical Files (Required for Data Restore):

1. **Database File**
   ```
   apps/api/dev.db
   ```
   - Contains ALL your data
   - Must be copied to exact same location

2. **Backup Files**
   ```
   backups/
   ```
   - All `.db` files in the `backups/` folder
   - Allows restoring to specific time points

3. **Uploaded Files**
   ```
   apps/api/uploads/
   ```
   - Consultant photos and other uploaded files
   - Preserves file associations

4. **Environment Variables**
   ```
   apps/api/.env
   apps/web/.env
   ```
   - Contains JWT secrets, API URLs, encryption keys
   - **CRITICAL**: Without these, authentication won't work

### Source Code (Optional - can clone from git):
- All files in the project directory
- Or just clone from git and copy the data files above

## Step-by-Step Restore Process

### 1. Copy Files from OneDrive

Copy these folders/files to the new laptop:

```
vsol-admin/
├── apps/
│   ├── api/
│   │   ├── dev.db          ← CRITICAL: All your data
│   │   ├── .env            ← CRITICAL: Secrets and config
│   │   └── uploads/        ← Uploaded files
│   └── web/
│       └── .env            ← Frontend config
└── backups/                ← All backup files
```

### 2. Install Dependencies

On the new laptop:

```powershell
cd C:\git\vsol-admin
pnpm install
```

### 3. Restore Environment Variables

**If `.env` files were copied:**
- Verify they exist in `apps/api/.env` and `apps/web/.env`
- Check that `JWT_SECRET` is set (minimum 32 characters)

**If `.env` files were NOT copied:**
- Create `apps/api/.env`:
  ```env
  PORT=2020
  JWT_SECRET=<your-secret-key-min-32-chars>
  DATABASE_URL=file:./dev.db
  ```
- Create `apps/web/.env`:
  ```env
  VITE_API_URL=http://localhost:2020/api
  ```

### 4. Restore Database Encryption Key (If Using SQLCipher)

If your database is encrypted with SQLCipher:

**Option A: Windows Credential Manager (Recommended)**
```powershell
# The key should be stored in Windows Credential Manager
# If it's not there, you need to restore it manually:
cmdkey /generic:VSolAdmin:SQLCipherKey /user:vsol /pass:<your-encryption-key>
```

**Option B: Environment Variable (Development Only)**
Add to `apps/api/.env`:
```env
SQLCIPHER_ENABLED=true
SQLCIPHER_KEY=<your-encryption-key>
```

**⚠️ WARNING**: Without the correct encryption key, the database cannot be opened.

### 5. Verify Database Integrity

```powershell
cd apps/api
sqlite3 dev.db "PRAGMA integrity_check;"
```

Should return: `ok`

### 6. Run Migrations (If Needed)

If the database schema needs updates:

```powershell
cd C:\git\vsol-admin
pnpm db:migrate
```

### 7. Start the Application

```powershell
pnpm dev
```

### 8. Verify Data

1. Login with your credentials
2. Check that consultants are visible
3. Check that cycles are visible
4. Verify uploaded files (consultant photos) display correctly

## Restoring to a Specific Time Point

If you want to restore to a specific backup instead of the current database:

### Option 1: Using the Settings Page

1. Start the application
2. Go to Settings → Database Backups
3. Select the backup from the dropdown (sorted by date, newest first)
4. Click "Restore Selected Backup"
5. Restart the server

### Option 2: Manual Restore

1. Stop the application
2. Copy the backup file over the current database:
   ```powershell
   cd apps/api
   Copy-Item "..\..\backups\vsol-admin-2024-01-15T10-30-00-000Z.db" "dev.db" -Force
   ```
3. Start the application

## What Won't Be Restored

### ❌ Not Restored (Must be recreated):
- Node.js installation (must install separately)
- pnpm installation (must install separately)
- Windows Credential Manager entries (if not synced)
- Local browser cache/cookies (login sessions)

### ⚠️ Potential Issues:

1. **Database Encryption Key Missing**
   - If using SQLCipher and key is not restored, database cannot be opened
   - Solution: Restore key from backup or use unencrypted database

2. **JWT_SECRET Mismatch**
   - If `JWT_SECRET` is different, existing tokens won't work
   - Solution: Users will need to login again (this is normal)

3. **File Path Differences**
   - If OneDrive path is different, update `DATABASE_URL` in `.env`
   - Solution: Use relative paths or update to new absolute path

4. **Missing Dependencies**
   - If `node_modules` is not copied, must run `pnpm install`
   - Solution: Always run `pnpm install` after copying

## Checklist for Complete Restore

- [ ] Copied `apps/api/dev.db` to new laptop
- [ ] Copied `apps/api/.env` to new laptop
- [ ] Copied `apps/web/.env` to new laptop
- [ ] Copied `backups/` folder to new laptop
- [ ] Copied `apps/api/uploads/` folder to new laptop
- [ ] Installed Node.js on new laptop
- [ ] Installed pnpm on new laptop
- [ ] Ran `pnpm install` in project directory
- [ ] Verified `.env` files have correct values
- [ ] Restored SQLCipher key (if using encryption)
- [ ] Ran `pnpm db:migrate` (if needed)
- [ ] Verified database integrity
- [ ] Started application with `pnpm dev`
- [ ] Tested login
- [ ] Verified data is visible
- [ ] Verified uploaded files display

## Time Point Restoration

To restore to a specific time point:

1. **Identify the backup file** from the `backups/` folder
   - Files are named: `vsol-admin-YYYY-MM-DDTHH-MM-SS-sssZ.db`
   - Or: `vsol-admin-login-YYYY-MM-DDTHH-MM-SS-sssZ.db` (automatic login backups)

2. **Use the Settings page** (easiest):
   - Go to Settings → Database Backups
   - Select the backup from dropdown
   - Click "Restore Selected Backup"

3. **Or manually**:
   ```powershell
   # Stop the application first
   cd apps/api
   Copy-Item "..\..\backups\<backup-filename>.db" "dev.db" -Force
   # Restart the application
   ```

## Important Notes

1. **Always backup before restoring**: The restore process creates a backup of the current database, but it's safer to manually backup first.

2. **Database file location**: The database must be in `apps/api/dev.db` (or update `DATABASE_URL` in `.env`).

3. **Encryption keys**: If using SQLCipher, the encryption key MUST be restored or the database cannot be opened.

4. **Environment variables**: Without correct `.env` files, the application won't work (authentication will fail).

5. **OneDrive sync**: Make sure OneDrive has finished syncing all files before copying to new laptop.

## Troubleshooting

### "Database file is encrypted or is not a database"
- The SQLCipher encryption key is missing or incorrect
- Restore the key from Windows Credential Manager or `.env`

### "Invalid credentials" after restore
- This is normal - JWT tokens are invalidated
- Users need to login again

### "Cannot find module" errors
- Run `pnpm install` to install dependencies

### Uploaded files not displaying
- Verify `apps/api/uploads/` folder was copied
- Check file permissions on the new laptop

### Database integrity check fails
- The database file may be corrupted
- Restore from a backup file instead

