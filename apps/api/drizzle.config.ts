import type { Config } from 'drizzle-kit';

export default {
  schema: './src/db/schema.ts',
  out: './drizzle',
  driver: 'libsql',
  dbCredentials: {
    url: process.env.DATABASE_URL || 'file:./dev.db'
  }
} satisfies Config;
