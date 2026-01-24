import { db, users, consultants, sqliteDb, initializeDatabase } from '../src/db';
import { fileStorage } from '../src/lib/file-storage';
import { eq } from 'drizzle-orm';

/**
 * Delete test consultant portal and all related data
 * 
 * This script deletes:
 * - User account
 * - Consultant equipment
 * - Vacation days
 * - Invoices (and uploaded files)
 * - Consultant record
 * 
 * Usage: tsx scripts/delete-test-consultant-portal.ts [consultant-id]
 */
async function deleteTestConsultantPortal(consultantId: number) {
  try {
    console.log(`🗑️  Starting deletion of test consultant portal (ID: ${consultantId})...\n`);

    // Initialize database (handles encryption if enabled)
    await initializeDatabase();

    // Check if consultant exists
    const consultant = sqliteDb.prepare('SELECT id, name, cnh_photo_path, address_proof_photo_path FROM consultants WHERE id = ?').get(consultantId) as any;

    if (!consultant) {
      console.error(`❌ Consultant with ID ${consultantId} not found`);
      process.exit(1);
      return;
    }

    console.log('📊 Consultant details:');
    console.log(`   ID: ${consultant.id}`);
    console.log(`   Name: ${consultant.name}`);

    // Check for line items (cannot delete if used in cycles)
    const lineItemCount = sqliteDb.prepare('SELECT COUNT(*) as count FROM cycle_line_items WHERE consultant_id = ?').get(consultantId) as any;
    const count = lineItemCount?.count || 0;

    if (count > 0) {
      console.error(`\n❌ Cannot delete consultant that has been used in payroll cycles.`);
      console.error(`   Found ${count} line item(s).`);
      console.error(`   Use termination date instead, or delete the cycles first.`);
      process.exit(1);
      return;
    }

    // Delete user account (remove dependencies first)
    console.log('\n👤 Deleting user account...');
    const user = sqliteDb.prepare('SELECT id, username FROM users WHERE consultant_id = ?').get(consultantId) as any;
    if (user) {
      const auditCount = sqliteDb.prepare('SELECT COUNT(*) as count FROM audit_logs WHERE user_id = ?').get(user.id) as any;
      sqliteDb.prepare('DELETE FROM audit_logs WHERE user_id = ?').run(user.id);
      console.log(`   ✅ Deleted ${auditCount?.count || 0} audit log(s)`);

      const tokenCount = sqliteDb.prepare('SELECT COUNT(*) as count FROM refresh_tokens WHERE user_id = ?').get(user.id) as any;
      sqliteDb.prepare('DELETE FROM refresh_tokens WHERE user_id = ?').run(user.id);
      console.log(`   ✅ Deleted ${tokenCount?.count || 0} refresh token(s)`);

      const settingsCount = sqliteDb.prepare('SELECT COUNT(*) as count FROM settings WHERE updated_by = ?').get(user.id) as any;
      sqliteDb.prepare('UPDATE settings SET updated_by = NULL WHERE updated_by = ?').run(user.id);
      console.log(`   ✅ Cleared updated_by on ${settingsCount?.count || 0} setting(s)`);

      const invoiceCount = sqliteDb.prepare('SELECT COUNT(*) as count FROM invoices WHERE uploaded_by = ?').get(user.id) as any;
      sqliteDb.prepare('UPDATE invoices SET uploaded_by = NULL WHERE uploaded_by = ?').run(user.id);
      console.log(`   ✅ Cleared uploaded_by on ${invoiceCount?.count || 0} invoice(s)`);

      const vacationCount = sqliteDb.prepare('SELECT COUNT(*) as count FROM vacation_days WHERE created_by = ?').get(user.id) as any;
      sqliteDb.prepare('UPDATE vacation_days SET created_by = NULL WHERE created_by = ?').run(user.id);
      console.log(`   ✅ Cleared created_by on ${vacationCount?.count || 0} vacation day(s)`);

      const sprintCount = sqliteDb.prepare('SELECT COUNT(*) as count FROM sprint_ceremonies WHERE created_by = ?').get(user.id) as any;
      sqliteDb.prepare('DELETE FROM sprint_ceremonies WHERE created_by = ?').run(user.id);
      console.log(`   ✅ Deleted ${sprintCount?.count || 0} sprint ceremony(ies)`);

      sqliteDb.prepare('DELETE FROM users WHERE consultant_id = ?').run(consultantId);
      console.log(`   ✅ Deleted user: ${user.username}`);
    } else {
      console.log(`   ⏭  No user account found`);
    }

    // Delete equipment
    console.log('\n💻 Deleting equipment...');
    const equipmentCount = sqliteDb.prepare('SELECT COUNT(*) as count FROM consultant_equipment WHERE consultant_id = ?').get(consultantId) as any;
    const equipmentDeleted = sqliteDb.prepare('DELETE FROM consultant_equipment WHERE consultant_id = ?').run(consultantId);
    console.log(`   ✅ Deleted ${equipmentCount?.count || 0} equipment record(s)`);

    // Delete vacation days
    console.log('\n✈️  Deleting vacation days...');
    const vacationCount = sqliteDb.prepare('SELECT COUNT(*) as count FROM vacation_days WHERE consultant_id = ?').get(consultantId) as any;
    const vacationDeleted = sqliteDb.prepare('DELETE FROM vacation_days WHERE consultant_id = ?').run(consultantId);
    console.log(`   ✅ Deleted ${vacationCount?.count || 0} vacation day(s)`);

    // Delete invoices and uploaded files
    console.log('\n📄 Deleting invoices...');
    const invoices = sqliteDb.prepare('SELECT id, file_path FROM invoices WHERE consultant_id = ?').all(consultantId) as any[];
    
    for (const invoice of invoices) {
      if (invoice.file_path) {
        try {
          await fileStorage.deleteFile(invoice.file_path);
          console.log(`   ✅ Deleted invoice file: ${invoice.file_path}`);
        } catch (error) {
          console.log(`   ⚠️  Could not delete invoice file: ${invoice.file_path} (may not exist)`);
        }
      }
    }
    
    const invoiceDeleted = sqliteDb.prepare('DELETE FROM invoices WHERE consultant_id = ?').run(consultantId);
    console.log(`   ✅ Deleted ${invoices.length} invoice record(s)`);

    // Delete associated consultant files (CNH, address proof)
    console.log('\n📎 Deleting consultant documents...');
    if (consultant.cnh_photo_path) {
      try {
        await fileStorage.deleteFile(consultant.cnh_photo_path);
        console.log(`   ✅ Deleted CNH photo: ${consultant.cnh_photo_path}`);
      } catch (error) {
        console.log(`   ⚠️  Could not delete CNH photo: ${consultant.cnh_photo_path} (may not exist)`);
      }
    }
    if (consultant.address_proof_photo_path) {
      try {
        await fileStorage.deleteFile(consultant.address_proof_photo_path);
        console.log(`   ✅ Deleted address proof photo: ${consultant.address_proof_photo_path}`);
      } catch (error) {
        console.log(`   ⚠️  Could not delete address proof photo: ${consultant.address_proof_photo_path} (may not exist)`);
      }
    }

    // Delete consultant from database
    console.log(`\n💾 Deleting consultant from database...`);
    sqliteDb.prepare('DELETE FROM consultants WHERE id = ?').run(consultantId);

    console.log(`\n✅ Successfully deleted test consultant portal (ID: ${consultantId}, Name: ${consultant.name})`);
    console.log(`\n📋 Summary:`);
    console.log(`   - User account: ${user ? 'deleted' : 'none'}`);
    console.log(`   - Equipment: ${equipmentCount?.count || 0} deleted`);
    console.log(`   - Vacation days: ${vacationCount?.count || 0} deleted`);
    console.log(`   - Invoices: ${invoices.length} deleted`);
    console.log(`   - Consultant: deleted`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error deleting test consultant portal:', error);
    if (error instanceof Error) {
      console.error('Error details:', error.message);
      if (error.stack) {
        console.error('Stack:', error.stack);
      }
    }
    process.exit(1);
  }
}

// Get consultant ID from command line arguments
const consultantId = process.argv[2] ? parseInt(process.argv[2], 10) : null;

if (!consultantId || isNaN(consultantId)) {
  console.error('❌ Usage: tsx scripts/delete-test-consultant-portal.ts [consultant-id]');
  console.error('   Example: tsx scripts/delete-test-consultant-portal.ts 7');
  console.error('\n   To find the consultant ID, check the consultants list in the admin UI');
  console.error('   or look for the ID in the creation script output.');
  process.exit(1);
}

deleteTestConsultantPortal(consultantId).catch((error) => {
  console.error('Unhandled error:', error);
  process.exit(1);
});
