import { sqliteDb, initializeDatabase } from '../src/db';

async function generateReport() {
  await initializeDatabase();
  
  console.log('='.repeat(60));
  console.log('CONSULTANT 7 DELETION DIAGNOSTIC REPORT');
  console.log('='.repeat(60));
  console.log('');
  
  // Check if consultant exists
  const consultant = sqliteDb.prepare('SELECT id, name, created_at FROM consultants WHERE id = 7').get() as any;
  
  if (!consultant) {
    console.log('✅ Consultant 7 does NOT exist in database');
    console.log('   Status: DELETED');
    process.exit(0);
    return;
  }
  
  console.log('📋 CONSULTANT INFORMATION:');
  console.log(`   ID: ${consultant.id}`);
  console.log(`   Name: ${consultant.name}`);
  console.log(`   Created: ${consultant.created_at ? new Date(consultant.created_at).toISOString() : 'N/A'}`);
  console.log('');
  
  // Check all relationships
  console.log('🔗 DATABASE RELATIONSHIPS:');
  
  const lineItems = sqliteDb.prepare(`
    SELECT cli.id, cli.cycle_id, pc.month_label, pc.id as cycle_id_num
    FROM cycle_line_items cli
    LEFT JOIN payroll_cycles pc ON cli.cycle_id = pc.id
    WHERE cli.consultant_id = 7
  `).all() as any[];
  
  console.log(`   Line Items (cycle_line_items): ${lineItems.length}`);
  if (lineItems.length > 0) {
    console.log('   ⚠️  BLOCKING DELETION - Consultant is in payroll cycles:');
    lineItems.forEach(item => {
      console.log(`      - Line Item ID ${item.id} → Cycle ID ${item.cycle_id_num} (${item.month_label || 'Unknown'})`);
    });
  }
  
  const invoices = sqliteDb.prepare('SELECT COUNT(*) as count FROM invoices WHERE consultant_id = 7').get() as any;
  console.log(`   Invoices: ${invoices?.count || 0}`);
  
  const payments = sqliteDb.prepare('SELECT COUNT(*) as count FROM payments WHERE consultant_id = 7').get() as any;
  console.log(`   Payments: ${payments?.count || 0}`);
  
  const equipment = sqliteDb.prepare('SELECT COUNT(*) as count FROM consultant_equipment WHERE consultant_id = 7').get() as any;
  console.log(`   Equipment Records: ${equipment?.count || 0}`);
  console.log('');
  
  // Check foreign key constraints
  console.log('🔒 FOREIGN KEY CONSTRAINTS:');
  const fkCheck = sqliteDb.pragma('foreign_keys') as any;
  console.log(`   Foreign Keys Enabled: ${fkCheck || 'Unknown'}`);
  console.log('');
  
  // Explain why deletion fails
  console.log('❌ WHY DELETION IS FAILING:');
  if (lineItems.length > 0) {
    console.log(`   1. Consultant has ${lineItems.length} line item(s) in payroll cycles`);
    console.log('   2. The API service (ConsultantService.delete) checks for line items');
    console.log('   3. If line items exist, it throws: "Cannot delete consultant that has been used in payroll cycles"');
    console.log('   4. This is a business rule to prevent data loss');
    console.log('');
    console.log('💡 SOLUTION:');
    console.log('   The deletion script must:');
    console.log('   1. Delete ALL line items first (removes from payroll cycles)');
    console.log('   2. Then delete invoices, payments, equipment');
    console.log('   3. Finally delete the consultant record');
    console.log('   4. Temporarily disable foreign keys if needed');
  } else {
    console.log('   No line items found - deletion should work');
    console.log('   Possible issues:');
    console.log('   - API server cache');
    console.log('   - Database connection issue');
    console.log('   - Foreign key constraint violation');
  }
  console.log('');
  
  // Show what needs to be deleted
  console.log('🗑️  DELETION PLAN:');
  console.log(`   1. Delete ${lineItems.length} line item(s) from cycle_line_items`);
  console.log(`   2. Delete ${invoices?.count || 0} invoice(s)`);
  console.log(`   3. Delete ${payments?.count || 0} payment(s)`);
  console.log(`   4. Delete ${equipment?.count || 0} equipment record(s)`);
  console.log(`   5. Delete consultant record`);
  console.log('');
  
  // Check if we can delete
  const canDelete = lineItems.length === 0;
  console.log('📊 DELETION STATUS:');
  console.log(`   Can delete via API: ${canDelete ? 'YES ✅' : 'NO ❌ (has line items)'}`);
  console.log(`   Can force delete via script: YES ✅ (with foreign_keys OFF)`);
  console.log('');
  
  console.log('='.repeat(60));
  
  process.exit(0);
}

generateReport().catch(error => {
  console.error('ERROR generating report:', error);
  process.exit(1);
});

