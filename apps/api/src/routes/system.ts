import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import { authenticateToken } from '../middleware/auth';
import { generalRateLimiter, writeRateLimiter } from '../middleware/rate-limit';
import {
  getBackupDirectory,
  getDatabasePath,
  backupDatabase,
  parseTimestampFromFilename,
  getEnvironment,
} from '../backup/database-backup';

const router = Router();

// All system routes require authentication
router.use(authenticateToken);

/**
 * GET /api/system/backup-status
 * Returns backup status information including directory, count, last backup, and recent backups
 */
router.get('/backup-status', generalRateLimiter, async (req, res, next) => {
  try {
    const backupDir = getBackupDirectory();
    const env = getEnvironment();
    
    // Ensure directory exists
    if (!fs.existsSync(backupDir)) {
      return res.json({
        backupDirectory: backupDir,
        totalCount: 0,
        lastBackup: null,
        recentBackups: [],
        environment: env,
      });
    }
    
    // List all backup files (support both old and new naming formats)
    const backupFiles = fs.readdirSync(backupDir)
      .filter(file => {
        return (
          (file.startsWith('vsol-admin-') && file.endsWith('.db')) ||
          file.startsWith('vsol-admin-login-') ||
          file.startsWith('vsol-admin-before-restore-')
        );
      })
      .map(file => {
        const filePath = path.join(backupDir, file);
        const stats = fs.statSync(filePath);
        const timestamp = parseTimestampFromFilename(file);
        
        return {
          filename: file,
          size: stats.size,
          created: stats.birthtime.toISOString(),
          modified: stats.mtime.toISOString(),
          // Use parsed timestamp if available, otherwise use file creation time
          timestamp: timestamp ? timestamp.toISOString() : stats.birthtime.toISOString(),
          timestampDate: timestamp || stats.birthtime,
        };
      })
      .sort((a, b) => {
        // Sort by timestamp (most recent first)
        return b.timestampDate.getTime() - a.timestampDate.getTime();
      });
    
    const lastBackup = backupFiles.length > 0 ? {
      filename: backupFiles[0].filename,
      created: backupFiles[0].created,
      timestamp: backupFiles[0].timestamp,
      size: backupFiles[0].size,
    } : null;
    
    // Get recent backups (up to 10)
    const recentBackups = backupFiles.slice(0, 10).map(file => ({
      filename: file.filename,
      created: file.created,
      timestamp: file.timestamp,
      size: file.size,
    }));
    
    res.json({
      backupDirectory: backupDir,
      totalCount: backupFiles.length,
      lastBackup,
      recentBackups,
      environment: env,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/system/backup-now
 * Triggers a manual backup
 */
router.post('/backup-now', writeRateLimiter, async (req, res, next) => {
  try {
    const result = await backupDatabase();
    
    res.json({
      success: true,
      message: 'Database backup created successfully',
      backup: {
        filename: result.filename,
        size: result.size,
        created: result.created,
      },
      deletedOldBackups: result.deletedOldBackups,
    });
  } catch (error: any) {
    if (error.message.includes('does not exist')) {
      return res.status(404).json({
        success: false,
        error: 'Database file not found',
        message: error.message,
      });
    }
    
    return res.status(500).json({
      success: false,
      error: 'Failed to create backup',
      message: error.message || 'Could not create backup',
    });
  }
});

export default router;




