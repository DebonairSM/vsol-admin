import { execSync } from 'child_process';
import { existsSync } from 'fs';

const dbPath = './dev.db';

console.log('🔐 Safe Database Migration');
console.log('==========================');
console.log('');

// Check if database exists
if (!existsSync(dbPath)) {
  console.error('❌ Database file not found!');
  console.error('   Run "pnpm db:init" first to create the database.');
  process.exit(1);
}

// Always create backup before migrations
console.log('📦 Creating backup before migration...');
try {
  execSync('node scripts/backup-db.js', { stdio: 'inherit' });
  console.log('');
} catch (error) {
  console.error('❌ Backup failed! Aborting migration.');
  console.error('   Your database remains unchanged.');
  process.exit(1);
}

// Run migrations
console.log('🚀 Running database migrations...');
console.log('');

try {
  execSync('tsx src/db/migrate.ts', { stdio: 'inherit' });
  console.log('');
  console.log('✅ Safe migration completed!');
} catch (error) {
  console.error('❌ Migration failed!');
  console.error('   A backup was created before this attempt.');
  console.error('   Check the error above for details.');
  console.error('');
  console.error('💡 To restore from backup:');
  console.error('   Run "pnpm db:backup:list" to see available backups');
  process.exit(1);
}

