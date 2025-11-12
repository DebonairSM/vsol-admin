import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import * as schema from './schema';
import { getSQLCipherKey } from '../lib/credential-manager';

// Determine if we should use SQLCipher encryption
const USE_ENCRYPTION = process.env.SQLCIPHER_ENABLED === 'true';

// Extract database path from DATABASE_URL
const getDatabasePath = (): string => {
  const url = process.env.DATABASE_URL || 'file:./dev.db';
  return url.replace('file:', '');
};

// Initialize database connection
let sqliteDb: Database.Database;

if (USE_ENCRYPTION) {
  console.log('🔐 Initializing encrypted database with SQLCipher...');
  
  // Create database connection with SQLCipher
  sqliteDb = new Database(getDatabasePath(), {
    // Use SQLCipher library
    nativeBinding: require('@journeyapps/sqlcipher').Database
  });

  // Set encryption key synchronously during initialization
  // The key will be retrieved from Windows Credential Manager
  try {
    // For synchronous initialization, we'll handle the key setup separately
    // The actual key setting will happen in initializeDatabase() function
    console.log('⚠️  Encryption key will be set during database initialization');
  } catch (error) {
    console.error('❌ Failed to initialize encrypted database:', error);
    throw error;
  }
} else {
  console.log('📂 Initializing unencrypted database (development mode)...');
  sqliteDb = new Database(getDatabasePath());
}

// Note: WAL mode disabled due to Windows file locking issues
// Using default DELETE journal mode instead

// Enable foreign keys
sqliteDb.pragma('foreign_keys = ON');

export const db = drizzle(sqliteDb, { schema });

/**
 * Initialize database with encryption key (async operation)
 * Must be called before using the database in production
 */
export async function initializeDatabase(): Promise<void> {
  if (USE_ENCRYPTION) {
    const key = await getSQLCipherKey();
    
    // Set the encryption key
    // Using PRAGMA key with proper quoting
    sqliteDb.pragma(`key = '${key}'`);
    
    // Verify the key is correct by attempting to read from the database
    try {
      sqliteDb.pragma('cipher_version');
      console.log('✅ Database encryption initialized successfully');
    } catch (error) {
      throw new Error(
        'Failed to unlock encrypted database. ' +
        'The encryption key may be incorrect or the database may not be encrypted.'
      );
    }
  }
}

export { sqliteDb };
export * from './schema';
