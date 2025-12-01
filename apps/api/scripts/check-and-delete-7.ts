import { sqliteDb, initializeDatabase } from '../src/db';

async function main() {
  await initializeDatabase();
  
  // Check if consultant exists
  const consultant = sqliteDb.prepare('SELECT id, name FROM consultants WHERE id = 7').get() as any;
  
  if (!consultant) {
    console.log('Consultant 7 does not exist');
    process.exit(0);
    return;
  }
  
  console.log(`Found consultant: ID ${consultant.id}, Name: ${consultant.name}\n`);
  
  // Check line items
  const lineItems = sqliteDb.prepare('SELECT id, cycle_id FROM cycle_line_items WHERE consultant_id = 7').all() as any[];
  console.log(`Found ${lineItems.length} line item(s):`);
  lineItems.forEach(item => {
    console.log(`  - Line item ID ${item.id} in cycle ${item.cycle_id}`);
  });
  console.log('');
  
  if (lineItems.length === 0) {
    console.log('No line items found. Deleting consultant...');
    const result = sqliteDb.prepare('DELETE FROM consultants WHERE id = 7').run();
    console.log(`Deleted ${result.changes} consultant record(s)`);
    process.exit(0);
    return;
  }
  
  // Delete line items first
  console.log('Deleting line items...');
  sqliteDb.pragma('foreign_keys = OFF');
  
  const r1 = sqliteDb.prepare('DELETE FROM cycle_line_items WHERE consultant_id = 7').run();
  console.log(`Deleted ${r1.changes} line item(s)\n`);
  
  // Delete other related records
  const r2 = sqliteDb.prepare('DELETE FROM invoices WHERE consultant_id = 7').run();
  console.log(`Deleted ${r2.changes} invoice(s)`);
  
  const r3 = sqliteDb.prepare('DELETE FROM payments WHERE consultant_id = 7').run();
  console.log(`Deleted ${r3.changes} payment(s)`);
  
  const r4 = sqliteDb.prepare('DELETE FROM consultant_equipment WHERE consultant_id = 7').run();
  console.log(`Deleted ${r4.changes} equipment record(s)\n`);
  
  // Now delete consultant
  console.log('Deleting consultant...');
  const result = sqliteDb.prepare('DELETE FROM consultants WHERE id = 7').run();
  console.log(`Deleted ${result.changes} consultant record(s)\n`);
  
  sqliteDb.pragma('foreign_keys = ON');
  
  // Verify
  const verify = sqliteDb.prepare('SELECT id FROM consultants WHERE id = 7').get();
  const verifyItems = sqliteDb.prepare('SELECT COUNT(*) as count FROM cycle_line_items WHERE consultant_id = 7').get() as any;
  
  if (verify) {
    console.error('ERROR: Consultant still exists!');
    process.exit(1);
  } else if (verifyItems && verifyItems.count > 0) {
    console.error(`ERROR: ${verifyItems.count} line item(s) still exist!`);
    process.exit(1);
  } else {
    console.log('SUCCESS: Consultant 7 and all related records deleted');
    process.exit(0);
  }
}

main().catch(error => {
  console.error('ERROR:', error);
  process.exit(1);
});

