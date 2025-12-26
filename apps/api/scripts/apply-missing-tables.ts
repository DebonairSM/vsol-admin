import Database from 'better-sqlite3';
import { readFileSync } from 'fs';
import { join } from 'path';

const dbPath = './dev.db';
const sqlite = new Database(dbPath);

console.log('🔧 Applying missing tables from migration 0025...');
console.log('');

// Check if tables exist
function tableExists(tableName: string): boolean {
  const result = sqlite.prepare(`
    SELECT name FROM sqlite_master 
    WHERE type='table' AND name=?
  `).get(tableName);
  return !!result;
}

// SQL statements from migration 0025
const statements = [
  {
    name: 'client_invoices',
    sql: `CREATE TABLE IF NOT EXISTS \`client_invoices\` (
	\`id\` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	\`invoice_number\` integer NOT NULL,
	\`cycle_id\` integer NOT NULL,
	\`client_id\` integer NOT NULL,
	\`invoice_date\` integer NOT NULL,
	\`due_date\` integer NOT NULL,
	\`status\` text DEFAULT 'DRAFT' NOT NULL,
	\`subtotal\` real DEFAULT 0 NOT NULL,
	\`tax\` real DEFAULT 0 NOT NULL,
	\`total\` real DEFAULT 0 NOT NULL,
	\`amount_due\` real DEFAULT 0 NOT NULL,
	\`notes\` text,
	\`payment_terms\` text,
	\`sent_date\` integer,
	\`approved_date\` integer,
	\`paid_date\` integer,
	\`created_at\` integer NOT NULL,
	\`updated_at\` integer NOT NULL,
	FOREIGN KEY (\`cycle_id\`) REFERENCES \`payroll_cycles\`(\`id\`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (\`client_id\`) REFERENCES \`clients\`(\`id\`) ON UPDATE no action ON DELETE no action
);`
  },
  {
    name: 'clients',
    sql: `CREATE TABLE IF NOT EXISTS \`clients\` (
	\`id\` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	\`name\` text NOT NULL,
	\`legal_name\` text,
	\`contact_name\` text,
	\`contact_phone\` text,
	\`contact_email\` text,
	\`address\` text,
	\`city\` text,
	\`state\` text,
	\`zip\` text,
	\`country\` text,
	\`tax_id\` text,
	\`payment_terms\` text,
	\`payment_notes\` text,
	\`created_at\` integer NOT NULL,
	\`updated_at\` integer NOT NULL
);`
  },
  {
    name: 'companies',
    sql: `CREATE TABLE IF NOT EXISTS \`companies\` (
	\`id\` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	\`name\` text NOT NULL,
	\`legal_name\` text,
	\`address\` text NOT NULL,
	\`city\` text NOT NULL,
	\`state\` text NOT NULL,
	\`zip\` text NOT NULL,
	\`country\` text NOT NULL,
	\`phone\` text,
	\`website\` text,
	\`email\` text,
	\`florida_tax_id\` text,
	\`federal_tax_id\` text,
	\`logo_path\` text,
	\`created_at\` integer NOT NULL,
	\`updated_at\` integer NOT NULL
);`
  },
  {
    name: 'invoice_line_items',
    sql: `CREATE TABLE IF NOT EXISTS \`invoice_line_items\` (
	\`id\` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	\`invoice_id\` integer NOT NULL,
	\`service_name\` text NOT NULL,
	\`description\` text NOT NULL,
	\`quantity\` integer DEFAULT 1 NOT NULL,
	\`rate\` real NOT NULL,
	\`amount\` real NOT NULL,
	\`consultant_ids\` text,
	\`sort_order\` integer DEFAULT 0 NOT NULL,
	\`created_at\` integer NOT NULL,
	\`updated_at\` integer NOT NULL,
	FOREIGN KEY (\`invoice_id\`) REFERENCES \`client_invoices\`(\`id\`) ON UPDATE no action ON DELETE no action
);`
  },
  {
    name: 'invoice_number_sequence',
    sql: `CREATE TABLE IF NOT EXISTS \`invoice_number_sequence\` (
	\`id\` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	\`next_number\` integer DEFAULT 199 NOT NULL,
	\`updated_at\` integer NOT NULL
);`
  }
];

// Apply missing tables
let created = 0;
let skipped = 0;

for (const { name, sql } of statements) {
  if (tableExists(name)) {
    console.log(`⏭️  Table \`${name}\` already exists, skipping...`);
    skipped++;
  } else {
    try {
      sqlite.exec(sql);
      console.log(`✅ Created table \`${name}\``);
      created++;
    } catch (error: any) {
      console.error(`❌ Failed to create table \`${name}\`: ${error.message}`);
    }
  }
}

// Add unique index if it doesn't exist
if (!tableExists('client_invoices')) {
  // Table was just created, so index will be created
} else {
  // Check if index exists
  const indexExists = sqlite.prepare(`
    SELECT name FROM sqlite_master 
    WHERE type='index' AND name='client_invoices_invoice_number_unique'
  `).get();
  
  if (!indexExists) {
    try {
      sqlite.exec(`CREATE UNIQUE INDEX \`client_invoices_invoice_number_unique\` ON \`client_invoices\` (\`invoice_number\`);`);
      console.log(`✅ Created unique index on client_invoices.invoice_number`);
    } catch (error: any) {
      console.error(`❌ Failed to create index: ${error.message}`);
    }
  } else {
    console.log(`⏭️  Index already exists, skipping...`);
  }
}

// Check if role and service_description columns exist on consultants table
const consultantsColumns = sqlite.prepare(`
  PRAGMA table_info(consultants)
`).all() as Array<{ name: string }>;

const hasRole = consultantsColumns.some(col => col.name === 'role');
const hasServiceDescription = consultantsColumns.some(col => col.name === 'service_description');

if (!hasRole) {
  try {
    sqlite.exec(`ALTER TABLE consultants ADD \`role\` text;`);
    console.log(`✅ Added \`role\` column to consultants table`);
  } catch (error: any) {
    console.error(`❌ Failed to add role column: ${error.message}`);
  }
} else {
  console.log(`⏭️  Column \`role\` already exists on consultants, skipping...`);
}

if (!hasServiceDescription) {
  try {
    sqlite.exec(`ALTER TABLE consultants ADD \`service_description\` text;`);
    console.log(`✅ Added \`service_description\` column to consultants table`);
  } catch (error: any) {
    console.error(`❌ Failed to add service_description column: ${error.message}`);
  }
} else {
  console.log(`⏭️  Column \`service_description\` already exists on consultants, skipping...`);
}

console.log('');
console.log(`✅ Applied missing tables: ${created} created, ${skipped} skipped`);

sqlite.close();
process.exit(0);







