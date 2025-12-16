import { sqliteDb, initializeDatabase } from '../src/db';

async function addRoleColumn() {
  try {
    console.log('🔧 Adding missing role column to consultants table...\n');

    // Initialize database (handles encryption if enabled)
    await initializeDatabase();

    // Check if column already exists
    const tableInfo = sqliteDb.prepare(`
      PRAGMA table_info(consultants);
    `).all() as Array<{ name: string; type: string }>;

    const hasRoleColumn = tableInfo.some(col => col.name === 'role');

    if (hasRoleColumn) {
      console.log('✅ Column "role" already exists in consultants table');
      return;
    }

    // Add the role column
    console.log('📝 Adding role column...');
    sqliteDb.exec('ALTER TABLE consultants ADD COLUMN role text;');
    console.log('✅ Successfully added role column');

    // Also check for service_description column
    const hasServiceDescription = tableInfo.some(col => col.name === 'service_description');
    if (!hasServiceDescription) {
      console.log('📝 Adding service_description column...');
      sqliteDb.exec('ALTER TABLE consultants ADD COLUMN service_description text;');
      console.log('✅ Successfully added service_description column');
    } else {
      console.log('✅ Column "service_description" already exists');
    }

    console.log('\n✅ Database schema updated successfully!');
  } catch (error: any) {
    console.error('❌ Failed to add column:', error.message);
    if (error.message.includes('duplicate column name')) {
      console.error('   Column already exists, this is safe to ignore');
    } else {
      process.exit(1);
    }
  } finally {
    sqliteDb.close();
  }
}

addRoleColumn();

