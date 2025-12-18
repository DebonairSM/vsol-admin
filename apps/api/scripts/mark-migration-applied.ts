import Database from 'better-sqlite3';

const dbPath = './dev.db';
const sqlite = new Database(dbPath);

console.log('📝 Marking migration 0025 as applied...');
console.log('');

// Check if __drizzle_migrations table exists
const migrationsTableExists = sqlite.prepare(`
  SELECT name FROM sqlite_master 
  WHERE type='table' AND name='__drizzle_migrations'
`).get();

if (!migrationsTableExists) {
  // Create the migrations table
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS __drizzle_migrations (
      id SERIAL PRIMARY KEY,
      hash text NOT NULL,
      created_at integer
    )
  `);
  console.log('✅ Created __drizzle_migrations table');
}

// Check if migration 0025 is already recorded
const migrationTag = '0025_exotic_blacklash';
const existing = sqlite.prepare(`
  SELECT hash FROM __drizzle_migrations WHERE hash = ?
`).get(migrationTag);

if (existing) {
  console.log(`⏭️  Migration ${migrationTag} already marked as applied`);
} else {
  // Insert migration record
  // Drizzle stores migrations with a hash format
  // We'll use the tag as the hash for simplicity
  sqlite.prepare(`
    INSERT INTO __drizzle_migrations (hash, created_at)
    VALUES (?, ?)
  `).run(migrationTag, Date.now());
  console.log(`✅ Marked migration ${migrationTag} as applied`);
}

sqlite.close();
console.log('');
console.log('✅ Done!');

process.exit(0);

