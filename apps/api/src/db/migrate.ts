import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import Database from 'better-sqlite3';

// Initialize database
const sqlite = new Database('./dev.db');
const db = drizzle(sqlite);

console.log('🚀 Running migrations...');

try {
  // Run all migrations from the drizzle folder
  migrate(db, { migrationsFolder: './drizzle' });
  console.log('✅ Migrations completed successfully!');
} catch (error) {
  console.error('❌ Migration failed:', error);
  process.exit(1);
}

sqlite.close();
process.exit(0);

