import fs from 'fs';
import path from 'path';
import os from 'os';

// Get database path
export const getDatabasePath = (): string => {
  const url = process.env.DATABASE_URL || 'file:./dev.db';
  return url.replace('file:', '');
};

// Get backups directory path
export const getBackupsDirectory = (): string => {
  // Check if BACKUP_DIRECTORY environment variable is set
  if (process.env.BACKUP_DIRECTORY) {
    return process.env.BACKUP_DIRECTORY;
  }
  
  // Default to OneDrive Documents folder if available
  const userHome = os.homedir();
  
  // Try common OneDrive Documents locations
  const oneDrivePaths = [
    path.join(userHome, 'OneDrive', 'Documents', 'backups'),
    path.join(userHome, 'OneDrive - Personal', 'Documents', 'backups'),
    path.join(userHome, 'OneDrive - Business', 'Documents', 'backups'),
  ];
  
  // Check if any OneDrive Documents path exists
  for (const oneDrivePath of oneDrivePaths) {
    if (fs.existsSync(path.dirname(oneDrivePath))) {
      return oneDrivePath;
    }
  }
  
  // Fallback to project directory backups folder
  return path.join(process.cwd(), 'backups');
};

export interface BackupResult {
  filename: string;
  size: number;
  created: string;
  deletedOldBackups: string[];
}

/**
 * Create a database backup
 * @param prefix Optional prefix for the backup filename (default: 'vsol-admin')
 * @returns Backup result with filename, size, and created timestamp
 */
export async function createBackup(prefix: string = 'vsol-admin'): Promise<BackupResult> {
  const backupsDir = getBackupsDirectory();
  const dbPath = getDatabasePath();
  
  // Create backups directory if it doesn't exist
  if (!fs.existsSync(backupsDir)) {
    fs.mkdirSync(backupsDir, { recursive: true });
  }
  
  // Check if database file exists
  if (!fs.existsSync(dbPath)) {
    throw new Error(`Database file "${dbPath}" does not exist`);
  }
  
  // Create backup filename with timestamp
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = path.join(backupsDir, `${prefix}-${timestamp}.db`);
  
  // Copy database file
  fs.copyFileSync(dbPath, backupPath);
  
  const backupStats = fs.statSync(backupPath);
  
  // Clean up old backups (keep last 10)
  // Include all backup files (vsol-admin-*, vsol-admin-login-*, vsol-admin-before-restore-*)
  const backupFiles = fs.readdirSync(backupsDir)
    .filter(file => (file.startsWith('vsol-admin-') || file.startsWith('vsol-admin-login-') || file.startsWith('vsol-admin-before-restore-')) && file.endsWith('.db'))
    .map(file => ({
      name: file,
      path: path.join(backupsDir, file),
      time: fs.statSync(path.join(backupsDir, file)).mtime
    }))
    .sort((a, b) => b.time.getTime() - a.time.getTime());
  
  const deletedFiles: string[] = [];
  if (backupFiles.length > 10) {
    const filesToDelete = backupFiles.slice(10);
    filesToDelete.forEach(file => {
      fs.unlinkSync(file.path);
      deletedFiles.push(file.name);
    });
  }
  
  return {
    filename: path.basename(backupPath),
    size: backupStats.size,
    created: backupStats.birthtime.toISOString(),
    deletedOldBackups: deletedFiles
  };
}

/**
 * Check if a backup should be created (to avoid too frequent backups)
 * Only creates backup if the last backup is older than the specified minutes
 * @param minMinutesBetweenBackups Minimum minutes between backups (default: 60)
 * @returns true if backup should be created, false otherwise
 */
export function shouldCreateBackup(minMinutesBetweenBackups: number = 60): boolean {
  const backupsDir = getBackupsDirectory();
  
  if (!fs.existsSync(backupsDir)) {
    return true; // No backups directory, create first backup
  }
  
  // Find the most recent backup
  // Include all backup files (vsol-admin-*, vsol-admin-login-*, vsol-admin-before-restore-*)
  const backupFiles = fs.readdirSync(backupsDir)
    .filter(file => (file.startsWith('vsol-admin-') || file.startsWith('vsol-admin-login-') || file.startsWith('vsol-admin-before-restore-')) && file.endsWith('.db'))
    .map(file => ({
      name: file,
      path: path.join(backupsDir, file),
      time: fs.statSync(path.join(backupsDir, file)).mtime
    }))
    .sort((a, b) => b.time.getTime() - a.time.getTime());
  
  if (backupFiles.length === 0) {
    return true; // No backups exist, create one
  }
  
  const mostRecentBackup = backupFiles[0];
  const minutesSinceLastBackup = (Date.now() - mostRecentBackup.time.getTime()) / (1000 * 60);
  
  return minutesSinceLastBackup >= minMinutesBetweenBackups;
}

