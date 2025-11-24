import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.join(__dirname, '../dev.db');
const db = new Database(dbPath);

console.log('Fixing October cycle work hours...\n');

// Get cycle 1
const cycle = db.prepare('SELECT id, month_label, global_work_hours FROM payroll_cycles WHERE id = ?').get(1) as any;

if (!cycle) {
  console.log('Cycle 1 not found!');
  process.exit(1);
}

console.log(`Cycle ID: ${cycle.id}`);
console.log(`Month Label: ${cycle.month_label}`);
console.log(`Current Global Work Hours: ${cycle.global_work_hours}`);

// Check if it's October
const isOctober = cycle.month_label?.toLowerCase().includes('october') || 
                  cycle.month_label?.toLowerCase().includes('oct') ||
                  cycle.month_label?.match(/2025-10|10-2025/);

if (!isOctober) {
  console.log('\n⚠️  This cycle is not October. Aborting.');
  db.close();
  process.exit(1);
}

if (cycle.global_work_hours === 184) {
  console.log('\n✅ Global work hours is already correct (184). No changes needed.');
  db.close();
  process.exit(0);
}

// Update global work hours to 184
const update = db.prepare('UPDATE payroll_cycles SET global_work_hours = ?, updated_at = ? WHERE id = ?');
update.run(184, Date.now(), 1);

console.log(`\n✅ Updated global_work_hours from ${cycle.global_work_hours} to 184`);

// Verify the update
const updated = db.prepare('SELECT global_work_hours FROM payroll_cycles WHERE id = ?').get(1) as any;
console.log(`Verified: global_work_hours is now ${updated.global_work_hours}`);

db.close();
console.log('\n✅ Done! Refresh the page to see the updated USD Total.');



