import Database from 'better-sqlite3';
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';

const db = new Database('./dev.db');

console.log('🚀 Initializing database schema...');

try {
  // Get all migration files in order
  const migrationsDir = join(__dirname, '../../drizzle');
  const migrationFiles = readdirSync(migrationsDir)
    .filter(file => file.endsWith('.sql'))
    .sort();

  console.log(`Found ${migrationFiles.length} migration files`);

  // Apply each migration
  for (const file of migrationFiles) {
    console.log(`  Applying ${file}...`);
    const sql = readFileSync(join(migrationsDir, file), 'utf-8');
    
    // Split by statement separator and execute each statement
    const statements = sql
      .split('--> statement-breakpoint')
      .map(s => s.trim())
      .filter(s => {
        // Skip empty statements and comment-only statements
        if (!s) return false;
        const lines = s.split('\n').filter(line => {
          const trimmed = line.trim();
          return trimmed && !trimmed.startsWith('/*') && !trimmed.startsWith('*') && !trimmed.startsWith('*/');
        });
        return lines.length > 0 && lines.join('').length > 0;
      });

    for (const statement of statements) {
      // Skip statements that are just comments
      if (statement.trim().startsWith('/*') && statement.trim().endsWith('*/')) {
        console.log(`    Skipping comment in ${file}`);
        continue;
      }
      
      try {
        db.exec(statement);
      } catch (error: any) {
        // Ignore "table already exists" errors
        if (error.message && error.message.includes('already exists')) {
          console.log(`    Table already exists, skipping...`);
        } else {
          console.warn(`    Warning: ${error.message}`);
        }
      }
    }
  }

  console.log('✅ Database schema initialized successfully!');
} catch (error) {
  console.error('❌ Failed to initialize schema:', error);
  process.exit(1);
} finally {
  db.close();
}

process.exit(0);

