# Database Safety Checklist

A practical guide for preventing data loss in software projects. Copy this to new projects and adapt as needed.

## Core Principles

1. **Backup before destruction** - Never delete data without creating a backup first
2. **Verify backups exist** - Check backup status regularly
3. **Test restoration** - Periodically verify backups can be restored
4. **Document recovery** - Keep clear instructions for data recovery
5. **Automate safety** - Build safety into scripts, don't rely on memory

## Implementation Checklist

### Initial Setup

- [ ] Create `backups/` directory in project root
- [ ] Add `backups/` to `.gitignore` (backups shouldn't be in version control)
- [ ] Create backup script that timestamps files (e.g., `backup-db.js`)
- [ ] Document backup location in README
- [ ] Set up backup retention policy (e.g., keep last 10-20 backups)

### Script Safety Patterns

#### Before Destructive Operations

Always backup before:
- Database resets
- Schema migrations
- Data migrations
- Seed operations (when database exists)
- Bulk updates or deletions

**Pattern (PowerShell):**
```powershell
# Check if database exists
if (Test-Path "database.db") {
    # Create backup directory if needed
    if (-not (Test-Path "backups")) {
        New-Item -ItemType Directory -Force -Path "backups" | Out-Null
    }
    
    # Create timestamped backup
    $timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
    $backupPath = "backups/db-backup-$timestamp.db"
    Copy-Item "database.db" $backupPath -Force
    
    Write-Host "Backup created: $backupPath"
}

# Proceed with destructive operation
```

**Pattern (JavaScript/Node.js):**
```javascript
const fs = require('fs');
const path = require('path');

function createBackup(dbPath) {
  const backupDir = path.join(__dirname, '../backups');
  
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }
  
  if (fs.existsSync(dbPath)) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = path.join(backupDir, `db-backup-${timestamp}.db`);
    fs.copyFileSync(dbPath, backupPath);
    console.log(`Backup created: ${backupPath}`);
    return backupPath;
  }
  
  return null;
}

// Use before destructive operation
createBackup('./database.db');
```

#### Confirmation Prompts

Add confirmation for operations that cannot be undone:

**PowerShell:**
```powershell
Write-Host "WARNING: This will delete all data!" -ForegroundColor Red
Write-Host "Continue? (Y/N): " -NoNewline
$confirmation = Read-Host

if ($confirmation -ne 'Y' -and $confirmation -ne 'y') {
    Write-Host "Operation cancelled"
    exit 0
}
```

**Bash:**
```bash
read -p "WARNING: This will delete all data! Continue? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Operation cancelled"
    exit 0
fi
```

#### Wrapper Scripts

Create safe versions of dangerous operations:

**Example: safe-migrate.js**
```javascript
const { execSync } = require('child_process');
const { createBackup } = require('./backup-db');

console.log('Creating backup before migration...');
createBackup('./database.db');

console.log('Running migration...');
try {
  execSync('node migrate.js', { stdio: 'inherit' });
  console.log('Migration completed successfully');
} catch (error) {
  console.error('Migration failed! Backup is available in backups/');
  process.exit(1);
}
```

### Package Scripts

**Good npm/pnpm scripts setup:**
```json
{
  "scripts": {
    "db:backup": "node scripts/backup-db.js",
    "db:backup:list": "node scripts/list-backups.js",
    "db:migrate": "node scripts/safe-migrate.js",
    "db:migrate:unsafe": "node scripts/migrate.js",
    "db:reset": "node scripts/reset-db.js",
    "db:seed": "node scripts/seed.js"
  }
}
```

Key points:
- Default commands are safe (auto-backup)
- Unsafe versions available with explicit `:unsafe` suffix
- Backup commands are easy to remember

### Backup Verification

Create a script to check backup health:

**backup-verification.js**
```javascript
const fs = require('fs');
const path = require('path');

function verifyBackups() {
  const backupDir = path.join(__dirname, '../backups');
  
  if (!fs.existsSync(backupDir)) {
    console.warn('No backups directory found!');
    return;
  }
  
  const backups = fs.readdirSync(backupDir)
    .filter(f => f.endsWith('.db'))
    .map(f => ({
      name: f,
      time: fs.statSync(path.join(backupDir, f)).mtime,
      size: fs.statSync(path.join(backupDir, f)).size
    }))
    .sort((a, b) => b.time - a.time);
  
  console.log(`Total backups: ${backups.length}`);
  
  if (backups.length === 0) {
    console.warn('No backups found! Run backup command.');
    return;
  }
  
  const mostRecent = backups[0];
  const daysSinceBackup = (Date.now() - mostRecent.time) / (1000 * 60 * 60 * 24);
  
  if (daysSinceBackup > 7) {
    console.warn(`Most recent backup is ${daysSinceBackup.toFixed(1)} days old!`);
  } else {
    console.log(`Most recent backup: ${mostRecent.name} (${daysSinceBackup.toFixed(1)} days ago)`);
  }
  
  backups.forEach((b, i) => {
    console.log(`  ${i + 1}. ${b.name} - ${(b.size / 1024).toFixed(2)} KB`);
  });
}

verifyBackups();
```

### Recovery Procedures

Document recovery steps in README:

```markdown
## Database Recovery

### List Available Backups

```bash
npm run db:backup:list
```

### Restore from Backup

**Stop the application first**, then:

```bash
# Copy backup over current database
cp backups/db-backup-TIMESTAMP.db database.db

# Or on Windows:
copy backups\db-backup-TIMESTAMP.db database.db
```

### Verify Restoration

```bash
# Test database integrity
sqlite3 database.db "PRAGMA integrity_check;"

# Start application and verify data
npm run dev
```
```

## Common Pitfalls to Avoid

### 1. Resetting Without Backup

**Bad:**
```bash
rm database.db
npm run db:init
```

**Good:**
```bash
npm run db:backup  # Backup first
npm run db:reset   # Script includes backup
```

### 2. Ignoring Backup Verification

Set up regular checks:
- Add to CI/CD pipeline
- Run weekly manually
- Check before major releases

### 3. No Retention Policy

**Bad:** Keep all backups forever (fills disk)

**Good:** Auto-cleanup in backup script:
```javascript
// Keep only last 10 backups
const backups = fs.readdirSync(backupDir)
  .filter(f => f.endsWith('.db'))
  .sort()
  .reverse();

if (backups.length > 10) {
  backups.slice(10).forEach(f => {
    fs.unlinkSync(path.join(backupDir, f));
  });
}
```

### 4. Backups in Git

**Never commit backups to version control:**
- Bloats repository size
- May contain sensitive data
- Use `.gitignore`

### 5. No Test Restores

Periodically test restoration:
```bash
# 1. Create test backup
npm run db:backup

# 2. Make a change
# 3. Restore backup
cp backups/latest.db database.db

# 4. Verify data is back
```

## Technology-Specific Tips

### SQLite

```bash
# Create backup
sqlite3 database.db ".backup backups/backup-$(date +%Y%m%d-%H%M%S).db"

# Verify integrity
sqlite3 database.db "PRAGMA integrity_check;"
```

### PostgreSQL

```bash
# Create backup
pg_dump dbname > backups/backup-$(date +%Y%m%d-%H%M%S).sql

# Restore
psql dbname < backups/backup-TIMESTAMP.sql
```

### MongoDB

```bash
# Create backup
mongodump --db dbname --out backups/backup-$(date +%Y%m%d-%H%M%S)

# Restore
mongorestore --db dbname backups/backup-TIMESTAMP/dbname
```

### MySQL

```bash
# Create backup
mysqldump dbname > backups/backup-$(date +%Y%m%d-%H%M%S).sql

# Restore
mysql dbname < backups/backup-TIMESTAMP.sql
```

## Environment-Specific Strategies

### Development

- Backup before migrations
- Backup before resets
- Keep 5-10 recent backups
- Can restore frequently

### Staging

- Backup before deployments
- Backup before data migrations
- Keep 20 backups
- Test restore procedures

### Production

- Automated daily backups
- Backup before any changes
- Keep 30+ days of backups
- Store backups off-site
- Encrypt backups
- Test restore quarterly
- Document restore runbook

## Quick Reference Card

Copy this to your project README:

```markdown
## Database Operations Quick Reference

| Task | Command | Backup? |
|------|---------|---------|
| Manual backup | `npm run db:backup` | N/A |
| List backups | `npm run db:backup:list` | N/A |
| Run migration | `npm run db:migrate` | Auto |
| Reset database | `npm run db:reset` | Auto |
| Restore backup | `cp backups/<file> database.db` | Manual |

**Always backup before:**
- Database resets
- Schema migrations
- Bulk operations
- Testing destructive code
```

## Checklist for New Projects

When starting a new project with a database:

- [ ] Set up backup script in first week
- [ ] Add backup to `.gitignore`
- [ ] Create safe wrapper scripts for dangerous operations
- [ ] Document recovery procedure in README
- [ ] Test backup and restore once
- [ ] Add confirmation prompts to destructive scripts
- [ ] Set up retention policy
- [ ] Schedule regular backup verification

## Additional Resources

- Keep seed data in CSV/JSON files under version control
- Use migrations for schema changes, not manual SQL
- Document database schema in `docs/database-schema.md`
- Keep a log of major data changes
- Consider using database snapshots for testing

---

**Remember:** The best backup is the one you make before you need it.

