import { sqliteDb, initializeDatabase } from '../src/db';

async function main() {
  try {
    await initializeDatabase();
    
    // Check if exists
    const check = sqliteDb.prepare('SELECT id, name FROM consultants WHERE id = 7').get() as any;
    
    if (!check) {
      console.log('Consultant 7 does not exist');
      process.exit(0);
      return;
    }
    
    console.log(`Found consultant: ID ${check.id}, Name: ${check.name}\n`);
    
    // Check which payroll cycles this consultant is in
    const cycles = sqliteDb.prepare(`
      SELECT DISTINCT pc.id, pc.month_label 
      FROM payroll_cycles pc
      INNER JOIN cycle_line_items cli ON pc.id = cli.cycle_id
      WHERE cli.consultant_id = 7
    `).all() as any[];
    
    if (cycles.length > 0) {
      console.log(`⚠️  Consultant is in ${cycles.length} payroll cycle(s):`);
      cycles.forEach(cycle => {
        console.log(`   - Cycle ID ${cycle.id}: ${cycle.month_label}`);
      });
      console.log('');
    }
    
    // Check all related records before deletion
    const lineItemsCount = sqliteDb.prepare('SELECT COUNT(*) as count FROM cycle_line_items WHERE consultant_id = 7').get() as any;
    const invoicesCount = sqliteDb.prepare('SELECT COUNT(*) as count FROM invoices WHERE consultant_id = 7').get() as any;
    const paymentsCount = sqliteDb.prepare('SELECT COUNT(*) as count FROM payments WHERE consultant_id = 7').get() as any;
    const equipmentCount = sqliteDb.prepare('SELECT COUNT(*) as count FROM consultant_equipment WHERE consultant_id = 7').get() as any;
    
    console.log('Related records to delete:');
    console.log(`   - Line items: ${lineItemsCount?.count || 0}`);
    console.log(`   - Invoices: ${invoicesCount?.count || 0}`);
    console.log(`   - Payments: ${paymentsCount?.count || 0}`);
    console.log(`   - Equipment: ${equipmentCount?.count || 0}\n`);
    
    // Disable foreign keys temporarily to force delete
    sqliteDb.pragma('foreign_keys = OFF');
    
    console.log('Deleting related records...');
    
    // Delete from payroll cycles (line items)
    const r1 = sqliteDb.prepare('DELETE FROM cycle_line_items WHERE consultant_id = 7').run();
    console.log(`   ✅ Deleted ${r1.changes} line item(s) from payroll cycles`);
    
    // Delete invoices
    const r2 = sqliteDb.prepare('DELETE FROM invoices WHERE consultant_id = 7').run();
    console.log(`   ✅ Deleted ${r2.changes} invoice(s)`);
    
    // Delete payments
    const r3 = sqliteDb.prepare('DELETE FROM payments WHERE consultant_id = 7').run();
    console.log(`   ✅ Deleted ${r3.changes} payment(s)`);
    
    // Delete equipment
    const r4 = sqliteDb.prepare('DELETE FROM consultant_equipment WHERE consultant_id = 7').run();
    console.log(`   ✅ Deleted ${r4.changes} equipment record(s)\n`);
    
    // Delete consultant
    console.log('Deleting consultant...');
    const result = sqliteDb.prepare('DELETE FROM consultants WHERE id = 7').run();
    console.log(`   ✅ Deleted ${result.changes} consultant record(s)\n`);
    
    // Re-enable foreign keys
    sqliteDb.pragma('foreign_keys = ON');
    
    // Verify
    const verify = sqliteDb.prepare('SELECT id FROM consultants WHERE id = 7').get();
    if (verify) {
      console.error('❌ ERROR: Consultant still exists!');
      process.exit(1);
    } else {
      console.log('✅ SUCCESS: Consultant 7 deleted and verified');
      console.log('   - Removed from all payroll cycles');
      console.log('   - All related records deleted');
      console.log('   - Consultant record deleted');
      process.exit(0);
    }
  } catch (error) {
    console.error('❌ ERROR:', error);
    if (error instanceof Error) {
      console.error(error.message);
      if (error.stack) {
        console.error(error.stack);
      }
    }
    process.exit(1);
  }
}

main();
