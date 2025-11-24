import fs from 'fs';
import path from 'path';
import {
  getDatabasePath,
  getBackupDirectory,
  backupDatabase,
  parseTimestampFromFilename,
  cleanOldBackups,
  type BackupResult,
} from '../backup/database-backup';

// Re-export for backward compatibility
export { getDatabasePath, parseTimestampFromFilename, cleanOldBackups };
export type { BackupResult };

// Legacy function name for backward compatibility
export const getBackupsDirectory = getBackupDirectory;

// Wrapper function for backward compatibility (old API used prefix parameter)
export async function createBackup(prefix: string = 'vsol-admin'): Promise<BackupResult> {
  // New backup system uses environment-aware naming, but we'll use the prefix if provided
  // Note: The new system will use the configured prefix from the module, not this parameter
  return backupDatabase();
}

/**
 * Check if a backup should be created (to avoid too frequent backups)
 * Only creates backup if the last backup is older than the specified minutes
 * @param minMinutesBetweenBackups Minimum minutes between backups (default: 60)
 * @returns true if backup should be created, false otherwise
 */
export function shouldCreateBackup(minMinutesBetweenBackups: number = 60): boolean {
  const backupsDir = getBackupDirectory();
  
  if (!fs.existsSync(backupsDir)) {
    return true; // No backups directory, create first backup
  }
  
  // Find the most recent backup
  // Include all backup files (vsol-admin-*, vsol-admin-login-*, vsol-admin-before-restore-*)
  const backupFiles = fs.readdirSync(backupsDir)
    .filter(file => {
      return (
        (file.startsWith('vsol-admin-') && file.endsWith('.db')) ||
        file.startsWith('vsol-admin-login-') ||
        file.startsWith('vsol-admin-before-restore-')
      );
    })
    .map(file => {
      const filePath = path.join(backupsDir, file);
      const timestamp = parseTimestampFromFilename(file);
      const stats = fs.statSync(filePath);
      
      return {
        name: file,
        path: filePath,
        // Use parsed timestamp if available, otherwise use mtime
        time: timestamp || stats.mtime,
      };
    })
    .sort((a, b) => b.time.getTime() - a.time.getTime());
  
  if (backupFiles.length === 0) {
    return true; // No backups exist, create one
  }
  
  const mostRecentBackup = backupFiles[0];
  const minutesSinceLastBackup = (Date.now() - mostRecentBackup.time.getTime()) / (1000 * 60);
  
  return minutesSinceLastBackup >= minMinutesBetweenBackups;
}
