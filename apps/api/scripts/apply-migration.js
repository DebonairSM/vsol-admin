require('dotenv/config');
const { createClient } = require('@libsql/client');
const { readFileSync } = require('fs');
const { join } = require('path');

const client = createClient({
  url: process.env.DATABASE_URL || 'file:./dev.db'
});

async function applyMigration() {
  const migrationPath = join(__dirname, '../drizzle/0011_fixed_ozymandias.sql');
  const migrationSql = readFileSync(migrationPath, 'utf-8');

  try {
    await client.execute(migrationSql);
    console.log('✅ Migration applied successfully');
    process.exit(0);
  } catch (error) {
    if (error.message?.includes('duplicate column') || error.message?.includes('already exists')) {
      console.log('ℹ️  Migration already applied (column exists)');
      process.exit(0);
    } else {
      console.error('❌ Error applying migration:', error.message);
      process.exit(1);
    }
  }
}

applyMigration();

