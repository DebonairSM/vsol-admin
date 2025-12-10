import { db, consultants, sqliteDb, initializeDatabase } from '../src/db';
import { fileStorage } from '../src/lib/file-storage';
import { eq } from 'drizzle-orm';

/**
 * Delete a consultant by ID
 * 
 * This script deletes a consultant from the database.
 * It will fail if the consultant has been used in any payroll cycles.
 */
async function deleteConsultant(consultantId: number) {
  try {
    console.log(`🗑️  Starting deletion of consultant ID ${consultantId}...\n`);

    // Initialize database (handles encryption if enabled)
    await initializeDatabase();

    // Check if consultant exists using direct SQL
    const consultant = sqliteDb.prepare('SELECT id, name, cnh_photo_path, address_proof_photo_path FROM consultants WHERE id = ?').get(consultantId) as any;

    if (!consultant) {
      console.error(`❌ Consultant with ID ${consultantId} not found`);
      process.exit(1);
      return;
    }

    console.log('📊 Consultant details:');
    console.log(`   ID: ${consultant.id}`);
    console.log(`   Name: ${consultant.name}`);

    // Check for line items
    const lineItemCount = sqliteDb.prepare('SELECT COUNT(*) as count FROM cycle_line_items WHERE consultant_id = ?').get(consultantId) as any;
    const count = lineItemCount?.count || 0;

    console.log(`   Line Items: ${count}`);

    if (count > 0) {
      console.error(`\n❌ Cannot delete consultant that has been used in payroll cycles.`);
      console.error(`   Found ${count} line item(s).`);
      console.error(`   Use termination date instead.`);
      process.exit(1);
      return;
    }

    // Delete associated files
    if (consultant.cnh_photo_path) {
      console.log(`   Deleting CNH photo: ${consultant.cnh_photo_path}`);
      await fileStorage.deleteFile(consultant.cnh_photo_path);
    }
    if (consultant.address_proof_photo_path) {
      console.log(`   Deleting address proof photo: ${consultant.address_proof_photo_path}`);
      await fileStorage.deleteFile(consultant.address_proof_photo_path);
    }

    // Delete consultant from database
    console.log(`\n💾 Deleting consultant from database...`);
    sqliteDb.prepare('DELETE FROM consultants WHERE id = ?').run(consultantId);

    console.log(`\n✅ Successfully deleted consultant ID ${consultantId} (${consultant.name})`);
    process.exit(0);
  } catch (error) {
    console.error('❌ Error deleting consultant:', error);
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
  console.error('❌ Usage: tsx scripts/delete-consultant.ts [consultant-id]');
  console.error('   Example: tsx scripts/delete-consultant.ts 7');
  console.error('   Note: Replace [consultant-id] with the actual numeric ID');
  process.exit(1);
}

deleteConsultant(consultantId).catch((error) => {
  console.error('Unhandled error:', error);
  process.exit(1);
});










