import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import { authenticateToken } from '../middleware/auth';
import { writeRateLimiter } from '../middleware/rate-limit';
import { validateBody } from '../middleware/validate';
import { z } from 'zod';
import { sqliteDb } from '../db';
import { createBackup } from '../services/backup-service';
import { getBackupsDirectory, getDatabasePath } from '../services/backup-service';

const router = Router();

// All backup routes require authentication and rate limiting
router.use(authenticateToken);
router.use(writeRateLimiter);

// Schema for restore request
const restoreBackupSchema = z.object({
  filename: z.string().min(1, 'Filename is required')
});

/**
 * GET /api/backups
 * List all available backup files with metadata
 */
router.get('/', async (req, res, next) => {
  try {
    const backupsDir = getBackupsDirectory();
    
    // Create backups directory if it doesn't exist
    if (!fs.existsSync(backupsDir)) {
      fs.mkdirSync(backupsDir, { recursive: true });
      return res.json({ backups: [], backupDirectory: backupsDir });
    }
    
    // Read all backup files (include all backup types)
    const files = fs.readdirSync(backupsDir)
      .filter(file => (file.startsWith('vsol-admin-') || file.startsWith('vsol-admin-login-') || file.startsWith('vsol-admin-before-restore-')) && file.endsWith('.db'))
      .map(file => {
        const filePath = path.join(backupsDir, file);
        const stats = fs.statSync(filePath);
        
        return {
          filename: file,
          size: stats.size,
          created: stats.birthtime.toISOString(),
          modified: stats.mtime.toISOString()
        };
      })
      .sort((a, b) => new Date(b.created).getTime() - new Date(a.created).getTime());
    
    res.json({ backups: files, backupDirectory: backupsDir });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/backups/create
 * Create a new database backup
 */
router.post('/create', async (req, res, next) => {
  try {
    const result = await createBackup();
    
    res.json({
      success: true,
      message: 'Database backup created successfully',
      backup: {
        filename: result.filename,
        size: result.size,
        created: result.created
      },
      deletedOldBackups: result.deletedOldBackups
    });
  } catch (error: any) {
    if (error.message.includes('does not exist')) {
      return res.status(404).json({
        error: 'Database file not found',
        message: error.message
      });
    }
    return res.status(500).json({
      error: 'Failed to create backup',
      message: error.message || 'Could not create backup'
    });
  }
});

/**
 * POST /api/backups/restore
 * Restore database from a backup file
 * Creates a backup of the current database before restoring
 */
router.post(
  '/restore',
  validateBody(restoreBackupSchema),
  async (req, res, next) => {
    try {
      const { filename } = req.body;
      const backupsDir = getBackupsDirectory();
      const backupPath = path.join(backupsDir, filename);
      const dbPath = getDatabasePath();
      
      // Validate backup file exists
      if (!fs.existsSync(backupPath)) {
        return res.status(404).json({ 
          error: 'Backup file not found',
          message: `Backup file "${filename}" does not exist`
        });
      }
      
      // Validate backup file is readable
      try {
        fs.accessSync(backupPath, fs.constants.R_OK);
      } catch (error) {
        return res.status(403).json({ 
          error: 'Backup file not readable',
          message: `Cannot read backup file "${filename}"`
        });
      }
      
      // Create backup of current database before restoring
      let preRestoreBackupPath: string | null = null;
      if (fs.existsSync(dbPath)) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        preRestoreBackupPath = path.join(backupsDir, `vsol-admin-before-restore-${timestamp}.db`);
        
        try {
          fs.copyFileSync(dbPath, preRestoreBackupPath);
        } catch (error: any) {
          return res.status(500).json({ 
            error: 'Failed to create pre-restore backup',
            message: `Could not backup current database: ${error.message}`
          });
        }
      }
      
      // Close database connection before file operations
      // Note: SQLite file operations require the connection to be closed
      try {
        sqliteDb.close();
      } catch (error: any) {
        // Log but continue - connection might already be closed or in use
        console.warn('Warning: Could not close database connection:', error.message);
        // Still attempt to copy - on Windows, this might work if file is not locked
      }
      
      // Copy backup file over current database
      try {
        // Wait a brief moment to ensure connection is fully closed
        await new Promise(resolve => setTimeout(resolve, 100));
        fs.copyFileSync(backupPath, dbPath);
      } catch (error: any) {
        // If restore failed, try to restore from pre-restore backup
        if (preRestoreBackupPath && fs.existsSync(preRestoreBackupPath)) {
          try {
            fs.copyFileSync(preRestoreBackupPath, dbPath);
            console.log('Restored from pre-restore backup due to error');
          } catch (restoreError: any) {
            console.error('Critical: Failed to restore from pre-restore backup', restoreError);
          }
        }
        
        return res.status(500).json({ 
          error: 'Failed to restore database',
          message: `Could not copy backup file: ${error.message}. The database file may be locked. Please stop the server, manually copy the backup file to ${dbPath}, and restart the server.`
        });
      }
      
      // Note: Database connection cannot be easily reopened without restarting the server
      // The connection object needs to be recreated at the module level
      // A server restart is required to use the restored database
      console.log('Database restored successfully. Server restart required to reconnect.');
      
      res.json({ 
        success: true,
        message: 'Database restored successfully. Please restart the server to reconnect to the database.',
        preRestoreBackup: preRestoreBackupPath ? path.basename(preRestoreBackupPath) : null
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
