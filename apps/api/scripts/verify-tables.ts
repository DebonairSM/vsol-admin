import Database from 'better-sqlite3';

const db = new Database('./dev.db');

const tables = db.prepare(`
  SELECT name FROM sqlite_master 
  WHERE type='table' 
  AND (name LIKE '%invoice%' OR name LIKE '%client%' OR name LIKE '%company%')
  ORDER BY name
`).all() as Array<{ name: string }>;

console.log('📋 Found tables:');
tables.forEach(t => console.log(`  - ${t.name}`));

if (tables.some(t => t.name === 'client_invoices')) {
  console.log('\n✅ client_invoices table exists!');
} else {
  console.log('\n❌ client_invoices table is missing!');
}

db.close();

