import { db, consultants, sqliteDb, initializeDatabase } from '../src/db';
import { eq } from 'drizzle-orm';

/**
 * Update consultant email addresses
 * 
 * This script updates the email addresses for consultants that were missing them.
 */
async function updateConsultantEmails() {
  try {
    console.log('📧 Updating consultant email addresses...\n');

    // Initialize database (handles encryption if enabled)
    await initializeDatabase();

    // Email updates: consultant ID -> email address
    const emailUpdates: Array<{ id: number; name: string; email: string }> = [
      { id: 1, name: 'Gustavo Moutella Vilela', email: 'gustavo.moutella@outlook.com' },
      { id: 2, name: 'Enzo Gehlen', email: 'enzo.gehlen@outlook.com' },
      { id: 3, name: 'Fabiano Louback Gonçalves', email: 'fabiano.louback@outlook.com' },
      { id: 4, name: 'Rafael Celegato', email: 'rafael.celegato@outlook.com' },
      { id: 5, name: 'Kristof Berge', email: 'kristof.berge@outlook.com' },
      { id: 6, name: 'Lucas R. L. Martins', email: 'lucas.martins@outlook.com' },
      { id: 8, name: 'Tiago Lima', email: 'tiago.lima@outlook.com' },
      { id: 9, name: 'Fernando Motta', email: 'fernando.motta@outlook.com' },
      { id: 10, name: 'Guilherme Martini Bronzatti', email: 'guilherme.bronzatti@outlook.com' }
    ];

    console.log(`📝 Updating ${emailUpdates.length} consultant(s)...\n`);

    let successCount = 0;
    let errorCount = 0;

    for (const update of emailUpdates) {
      try {
        // Verify consultant exists
        const consultant = await db.query.consultants.findFirst({
          where: eq(consultants.id, update.id)
        });

        if (!consultant) {
          console.error(`❌ Consultant ID ${update.id} (${update.name}) not found`);
          errorCount++;
          continue;
        }

        // Update email
        await db
          .update(consultants)
          .set({
            email: update.email,
            updatedAt: new Date()
          })
          .where(eq(consultants.id, update.id));

        console.log(`✅ Updated ID ${update.id.toString().padEnd(4)} | ${update.name.padEnd(35)} | ${update.email}`);
        successCount++;
      } catch (error) {
        console.error(`❌ Error updating ID ${update.id} (${update.name}):`, error instanceof Error ? error.message : error);
        errorCount++;
      }
    }

    console.log('\n📈 Summary:');
    console.log(`   Successfully updated: ${successCount}`);
    console.log(`   Errors: ${errorCount}`);
    console.log(`   Total: ${emailUpdates.length}`);

    if (errorCount === 0) {
      console.log('\n✅ All email addresses updated successfully!');
    } else {
      console.log(`\n⚠️  ${errorCount} update(s) failed. Please review the errors above.`);
    }

    process.exit(errorCount > 0 ? 1 : 0);
  } catch (error) {
    console.error('❌ Error updating consultant emails:', error);
    if (error instanceof Error) {
      console.error('Error details:', error.message);
      if (error.stack) {
        console.error('Stack:', error.stack);
      }
    }
    process.exit(1);
  }
}

updateConsultantEmails().catch((error) => {
  console.error('Unhandled error:', error);
  process.exit(1);
});










