import { execSync } from 'child_process';
import { existsSync } from 'fs';

const dbPath = './dev.db';

console.log('🔐 Safe Database Initialization');
console.log('================================');
console.log('');

// Check if database exists and create backup
if (existsSync(dbPath)) {
  console.log('📦 Creating backup before initialization...');
  try {
    execSync('node scripts/backup-db.js', { stdio: 'inherit' });
    console.log('');
  } catch (error) {
    console.error('❌ Backup failed! Aborting initialization.');
    console.error('   Your database remains unchanged.');
    process.exit(1);
  }
} else {
  console.log('ℹ️  No existing database found, skipping backup');
  console.log('');
}

// Run initialization
console.log('🚀 Running database initialization...');
console.log('');

try {
  execSync('tsx src/db/init-schema.ts', { stdio: 'inherit' });
  console.log('');
  console.log('✅ Safe initialization completed!');
} catch (error) {
  console.error('❌ Initialization failed!');
  console.error('   A backup was created before this attempt (if database existed).');
  console.error('   Check the error above for details.');
  process.exit(1);
}

