import { db, consultants, sqliteDb, initializeDatabase } from '../src/db';
import { or, isNull, eq } from 'drizzle-orm';

/**
 * List all consultants with their email status
 * 
 * Shows all consultants and whether they have an email address
 */
async function listAllConsultantsEmailStatus() {
  try {
    console.log('🔍 Listing all consultants with email status...\n');

    // Initialize database (handles encryption if enabled)
    await initializeDatabase();

    // Get all consultants
    const allConsultants = await db
      .select({
        id: consultants.id,
        name: consultants.name,
        email: consultants.email,
        terminationDate: consultants.terminationDate
      })
      .from(consultants)
      .orderBy(consultants.name);

    // Separate by status
    const withEmail = allConsultants.filter(c => 
      c.email && c.email.trim() !== ''
    );
    const withoutEmail = allConsultants.filter(c => 
      !c.email || c.email.trim() === ''
    );
    const active = allConsultants.filter(c => !c.terminationDate);
    const terminated = allConsultants.filter(c => c.terminationDate);

    console.log('📊 Email Status Summary:');
    console.log('─'.repeat(70));
    console.log(`   Total consultants: ${allConsultants.length}`);
    console.log(`   With email: ${withEmail.length}`);
    console.log(`   Without email: ${withoutEmail.length}`);
    console.log(`   Active: ${active.length}`);
    console.log(`   Terminated: ${terminated.length}`);
    console.log();

    if (withoutEmail.length > 0) {
      console.log('❌ Consultants WITHOUT Email:');
      console.log('─'.repeat(70));
      withoutEmail.forEach((consultant) => {
        const status = consultant.terminationDate ? 'TERMINATED' : 'ACTIVE';
        console.log(`   ID: ${consultant.id.toString().padEnd(4)} | ${status.padEnd(10)} | ${consultant.name}`);
      });
      console.log();
    }

    if (withEmail.length > 0) {
      console.log('✅ Consultants WITH Email:');
      console.log('─'.repeat(70));
      withEmail.forEach((consultant) => {
        const status = consultant.terminationDate ? 'TERMINATED' : 'ACTIVE';
        console.log(`   ID: ${consultant.id.toString().padEnd(4)} | ${status.padEnd(10)} | ${consultant.name.padEnd(35)} | ${consultant.email}`);
      });
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Error listing consultants:', error);
    if (error instanceof Error) {
      console.error('Error details:', error.message);
      if (error.stack) {
        console.error('Stack:', error.stack);
      }
    }
    process.exit(1);
  }
}

listAllConsultantsEmailStatus().catch((error) => {
  console.error('Unhandled error:', error);
  process.exit(1);
});

