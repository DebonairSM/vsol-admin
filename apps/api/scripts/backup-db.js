const fs = require('fs');
const path = require('path');

function backupDatabase() {
  const dbPath = process.env.DATABASE_URL?.replace('file:', '') || 'dev.db';
  const backupDir = path.join(__dirname, '..', '..', '..', 'backups');
  
  // Create backups directory if it doesn't exist
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }
  
  // Check if database file exists
  if (!fs.existsSync(dbPath)) {
    console.error(`❌ Database file not found: ${dbPath}`);
    process.exit(1);
  }
  
  // Create backup filename with timestamp
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = path.join(backupDir, `vsol-admin-${timestamp}.db`);
  
  try {
    // Copy database file
    fs.copyFileSync(dbPath, backupPath);
    
    console.log(`✅ Database backed up successfully!`);
    console.log(`📁 Backup location: ${backupPath}`);
    console.log(`📊 Backup size: ${(fs.statSync(backupPath).size / 1024).toFixed(2)} KB`);
    
    // Clean up old backups (keep last 10)
    const backupFiles = fs.readdirSync(backupDir)
      .filter(file => file.startsWith('vsol-admin-') && file.endsWith('.db'))
      .map(file => ({
        name: file,
        path: path.join(backupDir, file),
        time: fs.statSync(path.join(backupDir, file)).mtime
      }))
      .sort((a, b) => b.time - a.time);
    
    if (backupFiles.length > 10) {
      const filesToDelete = backupFiles.slice(10);
      filesToDelete.forEach(file => {
        fs.unlinkSync(file.path);
        console.log(`🗑️  Deleted old backup: ${file.name}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error creating backup:', error.message);
    process.exit(1);
  }
}

// Run backup if called directly
if (require.main === module) {
  backupDatabase();
}

module.exports = backupDatabase;
