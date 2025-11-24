import fs from 'fs';
import path from 'path';
import os from 'os';

export interface BackupConfig {
  prefix: string;
  appName: string;
  keepCount: number;
  env?: string;
}

export interface BackupResult {
  filename: string;
  size: number;
  created: string;
  deletedOldBackups: string[];
}

const DEFAULT_CONFIG: BackupConfig = {
  prefix: 'vsol-admin',
  appName: 'VSolAdmin',
  keepCount: 10,
};

/**
 * Get the environment identifier for backup filenames
 * Checks APP_ENV, falls back to NODE_ENV, defaults to 'dev'
 */
export function getEnvironment(): string {
  if (process.env.APP_ENV) {
    return process.env.APP_ENV;
  }
  
  if (process.env.NODE_ENV) {
    // Map NODE_ENV values to shorter identifiers
    if (process.env.NODE_ENV === 'production') {
      return 'prod';
    }
    if (process.env.NODE_ENV === 'development') {
      return 'dev';
    }
    return process.env.NODE_ENV;
  }
  
  return 'dev';
}

/**
 * Get the app-specific backup directory path
 * Returns: backups/VSolAdmin/ (in OneDrive Documents or regular Documents)
 */
export function getBackupDirectory(): string {
  // Check if BACKUP_PATH environment variable is set (should point to app-specific folder)
  if (process.env.BACKUP_PATH) {
    return process.env.BACKUP_PATH;
  }
  
  const userHome = os.homedir();
  const appName = DEFAULT_CONFIG.appName;
  
  // Try OneDrive Documents locations first
  const oneDrivePaths = [
    path.join(userHome, 'OneDrive', 'Documents', 'backups', appName),
    path.join(userHome, 'OneDrive - Personal', 'Documents', 'backups', appName),
    path.join(userHome, 'OneDrive - Business', 'Documents', 'backups', appName),
  ];
  
  // Check if any OneDrive Documents path exists
  for (const oneDrivePath of oneDrivePaths) {
    if (fs.existsSync(path.dirname(path.dirname(oneDrivePath)))) {
      return oneDrivePath;
    }
  }
  
  // Fallback to regular Documents folder
  const documentsPath = path.join(userHome, 'Documents', 'backups', appName);
  return documentsPath;
}

/**
 * Get the database source path
 */
export function getDatabasePath(): string {
  const url = process.env.DATABASE_URL || 'file:./dev.db';
  return url.replace('file:', '');
}

/**
 * Parse timestamp from backup filename
 * Supports both old format (vsol-admin-{timestamp}.db) and new format (vsol-admin-{env}-{timestamp}.db)
 */
export function parseTimestampFromFilename(filename: string): Date | null {
  // New format: vsol-admin-{env}-{timestamp}.db
  // Example: vsol-admin-dev-2025-11-24_13-23-48-244Z.db
  const newFormatMatch = filename.match(/^vsol-admin-[a-z]+-(\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2}-\d{3}Z)\.db$/);
  if (newFormatMatch) {
    const timestampStr = newFormatMatch[1];
    // Convert to ISO format: 2025-11-24_13-23-48-244Z -> 2025-11-24T13:23:48.244Z
    const isoStr = timestampStr.replace('_', 'T').replace(/-(\d{3})Z$/, '.$1Z');
    const date = new Date(isoStr);
    if (!isNaN(date.getTime())) {
      return date;
    }
  }
  
  // Old format: vsol-admin-{timestamp}.db
  // Example: vsol-admin-2025-11-24T13-23-48-123Z.db
  const oldFormatMatch = filename.match(/^vsol-admin-(\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d{3}Z)\.db$/);
  if (oldFormatMatch) {
    const timestampStr = oldFormatMatch[1];
    // Convert to ISO format: 2025-11-24T13-23-48-123Z -> 2025-11-24T13:23:48.123Z
    const isoStr = timestampStr.replace(/-(\d{2})-(\d{2})-(\d{3})Z$/, ':$1:$2.$3Z');
    const date = new Date(isoStr);
    if (!isNaN(date.getTime())) {
      return date;
    }
  }
  
  // Also support old format with colons/dots already replaced
  const oldFormatMatch2 = filename.match(/^vsol-admin-(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z)\.db$/);
  if (oldFormatMatch2) {
    const date = new Date(oldFormatMatch2[1]);
    if (!isNaN(date.getTime())) {
      return date;
    }
  }
  
  return null;
}

/**
 * Ensure directory exists and is writable
 * Creates directory recursively if needed and verifies write permissions
 */
export function ensureDirectoryExists(dirPath: string): void {
  // Create directory if it doesn't exist
  if (!fs.existsSync(dirPath)) {
    try {
      fs.mkdirSync(dirPath, { recursive: true });
    } catch (error: any) {
      throw new Error(`Failed to create backup directory "${dirPath}": ${error.message}`);
    }
  }
  
  // Verify write permissions by creating a test file
  const testFile = path.join(dirPath, '.write-test');
  try {
    fs.writeFileSync(testFile, 'test');
    fs.unlinkSync(testFile);
  } catch (error: any) {
    throw new Error(`Backup directory "${dirPath}" is not writable: ${error.message}`);
  }
}

/**
 * Clean up old backups beyond retention count
 * Sorts by filename timestamp (not file system mtime) for accuracy
 */
export function cleanOldBackups(backupDir: string, keepCount: number): string[] {
  if (!fs.existsSync(backupDir)) {
    return [];
  }
  
  // List all backup files (support both old and new naming formats)
  const backupFiles = fs.readdirSync(backupDir)
    .filter(file => {
      // Support old format: vsol-admin-*.db, vsol-admin-login-*.db, vsol-admin-before-restore-*.db
      // Support new format: vsol-admin-{env}-*.db
      return (
        (file.startsWith('vsol-admin-') && file.endsWith('.db')) ||
        file.startsWith('vsol-admin-login-') ||
        file.startsWith('vsol-admin-before-restore-')
      );
    })
    .map(file => {
      const filePath = path.join(backupDir, file);
      const timestamp = parseTimestampFromFilename(file);
      
      return {
        name: file,
        path: filePath,
        timestamp: timestamp,
        // Fallback to mtime if timestamp parsing fails
        fallbackTime: fs.statSync(filePath).mtime.getTime(),
      };
    })
    .sort((a, b) => {
      // Sort by parsed timestamp if available, otherwise use fallback time
      const timeA = a.timestamp ? a.timestamp.getTime() : a.fallbackTime;
      const timeB = b.timestamp ? b.timestamp.getTime() : b.fallbackTime;
      return timeB - timeA; // Most recent first
    });
  
  const deletedFiles: string[] = [];
  
  if (backupFiles.length > keepCount) {
    const filesToDelete = backupFiles.slice(keepCount);
    filesToDelete.forEach(file => {
      try {
        fs.unlinkSync(file.path);
        deletedFiles.push(file.name);
      } catch (error: any) {
        console.warn(`Failed to delete old backup "${file.name}": ${error.message}`);
      }
    });
  }
  
  return deletedFiles;
}

/**
 * Create or update restore instructions file in backup directory
 */
export function createRestoreInstructions(backupDir: string, sourcePath: string): void {
  const appName = DEFAULT_CONFIG.appName;
  const restoreFilePath = path.join(backupDir, `${appName}-RESTORE.md`);
  
  const instructions = `# ${appName} Database Restore Instructions

## Important Notes

- **STOP THE SERVER** before restoring the database
- This backup folder is dedicated to ${appName} backups
- The parent "backups" directory is shared by multiple applications
- Always verify the backup file before restoring

## Backup Location

Backup Directory: \`${backupDir}\`

## Database Location

Source Database: \`${sourcePath}\`

## Restore Steps (Windows)

1. **Stop the VSol Admin server** (if running)
   - Press Ctrl+C in the terminal where the server is running
   - Or close the terminal window

2. **Locate your backup file**
   - Navigate to: \`${backupDir}\`
   - Find the backup file you want to restore (e.g., \`vsol-admin-dev-2025-11-24_13-23-48-244Z.db\`)

3. **Create a backup of the current database** (safety measure)
   - Copy the current database file from: \`${sourcePath}\`
   - Save it with a different name (e.g., \`dev.db.backup\`)

4. **Restore the backup**
   - Copy your backup file to: \`${sourcePath}\`
   - Replace the existing database file

5. **Verify the restore**
   - Check that the file size matches the backup file
   - Check the file modification date

6. **Start the server**
   - Run: \`pnpm dev\` (or your start command)
   - Verify the application loads correctly

## Restore Command (PowerShell)

\`\`\`powershell
# Stop the server first!

# Navigate to backup directory
cd "${backupDir}"

# Copy backup to database location (replace BACKUP_FILENAME with actual filename)
Copy-Item "BACKUP_FILENAME" -Destination "${sourcePath}" -Force

# Verify
Get-Item "${sourcePath}" | Select-Object Name, Length, LastWriteTime
\`\`\`

## Restore Command (Command Prompt)

\`\`\`cmd
REM Stop the server first!

REM Navigate to backup directory
cd /d "${backupDir}"

REM Copy backup to database location (replace BACKUP_FILENAME with actual filename)
copy "BACKUP_FILENAME" "${sourcePath}" /Y

REM Verify
dir "${sourcePath}"
\`\`\`

## Troubleshooting

- **File is locked**: Make sure the server is completely stopped
- **Permission denied**: Run your terminal as Administrator
- **File not found**: Verify the backup file path is correct
- **Database won't open**: The backup file may be corrupted, try a different backup

## After Restore

- Restart the server to reconnect to the restored database
- Verify all data is present and correct
- Check the application logs for any errors

---

*This file is automatically generated and updated with each backup.*
*Last updated: ${new Date().toISOString()}*
`;

  try {
    fs.writeFileSync(restoreFilePath, instructions, 'utf8');
  } catch (error: any) {
    console.warn(`Failed to create restore instructions file: ${error.message}`);
  }
}

/**
 * Main backup function
 * Creates timestamped backup file, cleans up old backups, and creates restore instructions
 */
export async function backupDatabase(config?: Partial<BackupConfig>): Promise<BackupResult> {
  const finalConfig: BackupConfig = { ...DEFAULT_CONFIG, ...config };
  const env = config?.env || getEnvironment();
  const backupDir = getBackupDirectory();
  const dbPath = getDatabasePath();
  
  // Ensure backup directory exists and is writable
  ensureDirectoryExists(backupDir);
  
  // Check if database file exists
  if (!fs.existsSync(dbPath)) {
    throw new Error(`Database file "${dbPath}" does not exist`);
  }
  
  // Create timestamp in format: YYYY-MM-DD_HH-MM-SS-mmmZ
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, '0');
  const day = String(now.getUTCDate()).padStart(2, '0');
  const hours = String(now.getUTCHours()).padStart(2, '0');
  const minutes = String(now.getUTCMinutes()).padStart(2, '0');
  const seconds = String(now.getUTCSeconds()).padStart(2, '0');
  const milliseconds = String(now.getUTCMilliseconds()).padStart(3, '0');
  
  const timestamp = `${year}-${month}-${day}_${hours}-${minutes}-${seconds}-${milliseconds}Z`;
  
  // Create backup filename: vsol-admin-{env}-{timestamp}.db
  const backupFilename = `${finalConfig.prefix}-${env}-${timestamp}.db`;
  const backupPath = path.join(backupDir, backupFilename);
  
  // Copy database file
  fs.copyFileSync(dbPath, backupPath);
  
  const backupStats = fs.statSync(backupPath);
  
  // Clean up old backups
  const deletedFiles = cleanOldBackups(backupDir, finalConfig.keepCount);
  
  // Create/update restore instructions file
  createRestoreInstructions(backupDir, dbPath);
  
  return {
    filename: backupFilename,
    size: backupStats.size,
    created: backupStats.birthtime.toISOString(),
    deletedOldBackups: deletedFiles,
  };
}




