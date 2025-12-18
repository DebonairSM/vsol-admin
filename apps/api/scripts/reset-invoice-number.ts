import { db, invoiceNumberSequence, sqliteDb, initializeDatabase } from '../src/db';
import { eq } from 'drizzle-orm';

async function resetInvoiceNumber() {
  try {
    const targetNumberArg = process.argv[2];
    const targetNumber = targetNumberArg ? Number(targetNumberArg) : 198;

    if (!Number.isFinite(targetNumber) || targetNumber <= 0) {
      console.log('❌ Invalid invoice number. Usage: pnpm --filter api tsx scripts/reset-invoice-number.ts [invoiceNumber]');
      process.exit(1);
      return;
    }

    console.log(`🔧 Resetting invoice number sequence to ${targetNumber}...\n`);

    // Initialize database
    await initializeDatabase();

    // Get the current sequence (singleton)
    const sequence = await db.query.invoiceNumberSequence.findFirst();

    if (!sequence) {
      console.log('⚠️  No invoice number sequence found. Creating new sequence...');
      await db.insert(invoiceNumberSequence).values({
        nextNumber: targetNumber
      });
      console.log(`✅ Created invoice number sequence with nextNumber: ${targetNumber}`);
    } else {
      const oldNumber = sequence.nextNumber;
      console.log(`   Current nextNumber: ${oldNumber}`);
      console.log(`   Setting nextNumber to: ${targetNumber}\n`);

      // Update the sequence
      await db.update(invoiceNumberSequence)
        .set({
          nextNumber: targetNumber,
          updatedAt: new Date()
        })
        .where(eq(invoiceNumberSequence.id, sequence.id));

      console.log(`✅ Invoice number sequence reset from ${oldNumber} to ${targetNumber}`);
      console.log(`   Next invoice created will use number: ${targetNumber}`);
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Failed to reset invoice number sequence:', error);
    process.exit(1);
  }
}

resetInvoiceNumber();

