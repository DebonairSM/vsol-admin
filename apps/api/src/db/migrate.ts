import Database from 'better-sqlite3';
import { readFileSync, readdirSync } from 'fs';
import path from 'path';

// Initialize database
const sqlite = new Database('./dev.db');

console.log('🚀 Running migrations...');

try {
  /**
   * Tolerant local SQLite migrator.
   *
   * We intentionally avoid Drizzle's sqlite migrator here because:
   * - some historical migration chunks include comments-only sections
   * - some chunks contain multiple statements
   * - dev.db may already be initialized (tables exist) while migrations tracking is empty
   *
   * We execute migration chunks via `sqlite.exec()` and ignore idempotent errors like:
   * - table/index already exists
   * - duplicate column name
   * - no such column/table (e.g., dropping a column that was already dropped)
   */
  const migrationsFolder = path.join(process.cwd(), 'drizzle');

  const hasMigrationsTable = sqlite
    .prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name='__drizzle_migrations'")
    .get();

  if (!hasMigrationsTable) {
    sqlite.exec(`
      CREATE TABLE "__drizzle_migrations" (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        hash TEXT NOT NULL,
        created_at numeric
      );
    `);
  }

  const applied = new Set(
    (sqlite.prepare('SELECT hash FROM __drizzle_migrations').all() as Array<{ hash: string }>).map((r) => r.hash)
  );

  // If the DB is already initialized (tables exist) but migrations tracking is empty,
  // baseline to the previous journal tag so only newly generated migrations apply.
  if (applied.size === 0) {
    const existingUserTables = sqlite
      .prepare(
        "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name != '__drizzle_migrations'"
      )
      .all() as Array<{ name: string }>;

    if (existingUserTables.length > 0) {
      const journalPath = path.join(migrationsFolder, 'meta', '_journal.json');
      const journal = JSON.parse(readFileSync(journalPath, 'utf-8')) as { entries?: Array<{ tag: string }> };
      const entries = journal.entries ?? [];
      const baselineTag =
        entries.length >= 2 ? entries[entries.length - 2].tag : entries.length === 1 ? entries[0].tag : null;

      if (baselineTag) {
        sqlite
          .prepare('INSERT INTO __drizzle_migrations (hash, created_at) VALUES (?, ?)')
          .run(baselineTag, Math.floor(Date.now() / 1000));
        applied.add(baselineTag);
        console.log(`ℹ️  Baseline applied: marked migrations up to "${baselineTag}" as applied.`);
      }
    }
  }

  const migrationFiles = readdirSync(migrationsFolder)
    .filter((f) => f.endsWith('.sql'))
    .sort((a, b) => a.localeCompare(b));

  const shouldIgnoreError = (message: string) => {
    const m = message.toLowerCase();
    return (
      m.includes('already exists') ||
      m.includes('duplicate column name') ||
      m.includes('duplicate index name') ||
      m.includes('no such column') ||
      m.includes('no such table')
    );
  };

  const getMigrationNumber = (tag: string) => {
    const match = tag.match(/^(\d+)/);
    return match ? Number(match[1]) : Number.NaN;
  };

  const maxAppliedNumber = Array.from(applied).reduce((max, tag) => {
    const n = getMigrationNumber(tag);
    return Number.isFinite(n) && n > max ? n : max;
  }, -1);

  for (const fileName of migrationFiles) {
    const tag = fileName.replace(/\.sql$/i, '');
    const fileNumber = getMigrationNumber(tag);
    if (Number.isFinite(fileNumber) && fileNumber <= maxAppliedNumber) continue;
    if (applied.has(tag)) continue;

    const sql = readFileSync(path.join(migrationsFolder, fileName), 'utf-8');
    const chunks = sql.split(/--> statement-breakpoint\s*/g);

    for (const chunk of chunks) {
      const trimmed = chunk.trim();
      if (!trimmed) continue;

      // Skip comment-only chunks
      const withoutComments = trimmed.replace(/\/\*[\s\S]*?\*\//g, '').replace(/--.*$/gm, '').trim();
      if (!withoutComments) continue;

      try {
        sqlite.exec(trimmed);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        if (shouldIgnoreError(msg)) continue;
        throw e;
      }
    }

    sqlite
      .prepare('INSERT INTO __drizzle_migrations (hash, created_at) VALUES (?, ?)')
      .run(tag, Math.floor(Date.now() / 1000));
    applied.add(tag);
  }

  console.log('✅ Migrations completed successfully!');
} catch (error) {
  console.error('❌ Migration failed:', error);
  process.exit(1);
} finally {
  sqlite.close();
}

