import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.join(__dirname, '../dev.db');
const db = new Database(dbPath);

console.log('Checking cycle 1 data...\n');

// Get cycle 1
const cycle = db.prepare('SELECT id, month_label, global_work_hours FROM payroll_cycles WHERE id = ?').get(1) as any;

if (!cycle) {
  console.log('Cycle 1 not found!');
  process.exit(1);
}

console.log(`Cycle ID: ${cycle.id}`);
console.log(`Month Label: ${cycle.month_label}`);
console.log(`Global Work Hours: ${cycle.global_work_hours}\n`);

// Check if it's October
const isOctober = cycle.month_label?.toLowerCase().includes('october') || 
                  cycle.month_label?.toLowerCase().includes('oct') ||
                  cycle.month_label?.match(/2025-10|10-2025/);

console.log(`Is October: ${isOctober}\n`);

// Get all line items for cycle 1
const lineItems = db.prepare(`
  SELECT 
    cli.id,
    cli.work_hours,
    c.name as consultant_name,
    cli.rate_per_hour
  FROM cycle_line_items cli
  JOIN consultants c ON cli.consultant_id = c.id
  WHERE cli.cycle_id = 1
`).all() as any[];

console.log(`Line Items (${lineItems.length}):`);
lineItems.forEach((line, idx) => {
  console.log(`  ${idx + 1}. ${line.consultant_name}: workHours=${line.work_hours ?? 'null (uses global)'}, rate=${line.rate_per_hour}`);
});

console.log('\n--- Analysis ---');
const hasIndividualWorkHours = lineItems.some(line => line.work_hours !== null);
console.log(`Line items with individual workHours set: ${lineItems.filter(l => l.work_hours !== null).length}/${lineItems.length}`);

if (isOctober && cycle.global_work_hours === 160) {
  console.log('\n⚠️  ISSUE FOUND: October cycle has globalWorkHours=160, should be 184');
  console.log('\nOptions:');
  console.log('1. Update globalWorkHours to 184 (if all consultants work same hours)');
  console.log('2. Set individual workHours=184 for each line item (if consultants have different hours)');
} else if (isOctober && cycle.global_work_hours === 184) {
  console.log('\n✅ Global work hours is correct (184)');
} else if (!isOctober) {
  console.log(`\nℹ️  This is not October, so 160 might be correct for this month`);
}

db.close();



