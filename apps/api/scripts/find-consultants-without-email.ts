import { db, consultants, sqliteDb, initializeDatabase } from '../src/db';
import { or, isNull, eq } from 'drizzle-orm';

/**
 * Find all consultants that do not have an email address
 * 
 * This script queries the database to find consultants where:
 * - email is NULL
 * - email is an empty string
 */
async function findConsultantsWithoutEmail() {
  try {
    console.log('🔍 Finding consultants without email addresses...\n');

    // Initialize database (handles encryption if enabled)
    await initializeDatabase();

    // Query consultants where email is null or empty
    const consultantsWithoutEmail = await db
      .select({
        id: consultants.id,
        name: consultants.name,
        email: consultants.email,
        terminationDate: consultants.terminationDate
      })
      .from(consultants)
      .where(
        or(
          isNull(consultants.email),
          eq(consultants.email, '')
        )
      )
      .orderBy(consultants.name);

    if (consultantsWithoutEmail.length === 0) {
      console.log('✅ All consultants have email addresses!');
      process.exit(0);
      return;
    }

    console.log(`📊 Found ${consultantsWithoutEmail.length} consultant(s) without email:\n`);

    // Separate active and terminated consultants
    const active = consultantsWithoutEmail.filter(c => !c.terminationDate);
    const terminated = consultantsWithoutEmail.filter(c => c.terminationDate);

    if (active.length > 0) {
      console.log('👤 Active Consultants (without email):');
      console.log('─'.repeat(60));
      active.forEach((consultant) => {
        console.log(`   ID: ${consultant.id.toString().padEnd(4)} | Name: ${consultant.name}`);
      });
      console.log();
    }

    if (terminated.length > 0) {
      console.log('👤 Terminated Consultants (without email):');
      console.log('─'.repeat(60));
      terminated.forEach((consultant) => {
        const termDate = consultant.terminationDate 
          ? new Date(consultant.terminationDate).toLocaleDateString()
          : 'N/A';
        console.log(`   ID: ${consultant.id.toString().padEnd(4)} | Name: ${consultant.name.padEnd(30)} | Terminated: ${termDate}`);
      });
      console.log();
    }

    console.log(`\n📈 Summary:`);
    console.log(`   Total consultants without email: ${consultantsWithoutEmail.length}`);
    console.log(`   Active: ${active.length}`);
    console.log(`   Terminated: ${terminated.length}`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Error finding consultants:', error);
    if (error instanceof Error) {
      console.error('Error details:', error.message);
      if (error.stack) {
        console.error('Stack:', error.stack);
      }
    }
    process.exit(1);
  }
}

findConsultantsWithoutEmail().catch((error) => {
  console.error('Unhandled error:', error);
  process.exit(1);
});

