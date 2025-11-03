const fs = require('fs');
const path = require('path');

function verifyBackups() {
  const backupDir = path.join(__dirname, '..', '..', '..', 'backups');
  
  // Check if backups directory exists
  if (!fs.existsSync(backupDir)) {
    console.log('📂 Backups directory does not exist yet');
    console.log(`   Expected location: ${backupDir}`);
    console.log('');
    console.log('💡 Run "pnpm db:backup" to create your first backup');
    return;
  }
  
  // Get all backup files
  const backupFiles = fs.readdirSync(backupDir)
    .filter(file => file.endsWith('.db'))
    .map(file => ({
      name: file,
      path: path.join(backupDir, file),
      time: fs.statSync(path.join(backupDir, file)).mtime,
      size: fs.statSync(path.join(backupDir, file)).size
    }))
    .sort((a, b) => b.time - a.time);
  
  if (backupFiles.length === 0) {
    console.log('📂 Backups directory is empty');
    console.log(`   Location: ${backupDir}`);
    console.log('');
    console.log('💡 Run "pnpm db:backup" to create your first backup');
    return;
  }
  
  // Display backup information
  console.log('');
  console.log('📦 Database Backups');
  console.log('='.repeat(80));
  console.log('');
  console.log(`Total backups: ${backupFiles.length}`);
  console.log(`Backup directory: ${backupDir}`);
  console.log('');
  
  // Check for recent backups
  const now = new Date();
  const sevenDaysAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);
  const mostRecent = backupFiles[0];
  const hasRecentBackup = mostRecent.time > sevenDaysAgo;
  
  if (!hasRecentBackup) {
    console.log('⚠️  WARNING: No backups created in the last 7 days!');
    console.log('   Consider running "pnpm db:backup" to create a fresh backup');
    console.log('');
  }
  
  // Calculate total size
  const totalSize = backupFiles.reduce((sum, file) => sum + file.size, 0);
  console.log(`Total backup size: ${(totalSize / 1024 / 1024).toFixed(2)} MB`);
  console.log('');
  
  // Display backup list
  console.log('Backups (most recent first):');
  console.log('-'.repeat(80));
  
  backupFiles.forEach((file, index) => {
    const isRecent = file.time > sevenDaysAgo;
    const sizeKB = (file.size / 1024).toFixed(2);
    const timeStr = file.time.toLocaleString();
    const marker = index === 0 ? '📌 ' : '   ';
    const recentMarker = isRecent ? '🟢' : '⚪';
    
    console.log(`${marker}${recentMarker} ${file.name}`);
    console.log(`     Date: ${timeStr}`);
    console.log(`     Size: ${sizeKB} KB`);
    
    if (index === 0) {
      console.log(`     Status: Most recent backup`);
    }
    
    console.log('');
  });
  
  // Show recovery instructions
  console.log('-'.repeat(80));
  console.log('');
  console.log('💡 To restore a backup:');
  console.log('');
  console.log('   PowerShell:');
  console.log('   cd apps/api');
  console.log('   Copy-Item "..\\..\\backups\\<backup-file>" "dev.db" -Force');
  console.log('');
  console.log('   Bash:');
  console.log('   cd apps/api');
  console.log('   cp ../../backups/<backup-file> dev.db');
  console.log('');
}

// Run verification if called directly
if (require.main === module) {
  verifyBackups();
}

module.exports = verifyBackups;

