import { db, clientInvoices, sqliteDb, initializeDatabase } from '../src/db';
import { eq } from 'drizzle-orm';

/**
 * Reset Invoice #200 status to DRAFT and clear sentDate
 * This allows the invoice to be sent again
 */

async function resetInvoice200() {
  try {
    console.log('🔧 Resetting Invoice #200...\n');

    // Initialize database
    await initializeDatabase();

    // Find Invoice #200
    console.log('📋 Finding Invoice #200...\n');
    const invoice = await db.query.clientInvoices.findFirst({
      where: eq(clientInvoices.invoiceNumber, 200),
      with: {
        cycle: true,
        client: true
      }
    });

    if (!invoice) {
      console.log('❌ Invoice #200 not found');
      process.exit(1);
      return;
    }

    console.log(`✓ Found Invoice #200 (ID: ${invoice.id})`);
    console.log(`   Cycle: ${invoice.cycle?.monthLabel || 'Unknown'}`);
    console.log(`   Client: ${invoice.client?.name || 'Unknown'}`);
    console.log(`   Current Status: ${invoice.status}`);
    console.log(`   Sent Date: ${invoice.sentDate ? new Date(invoice.sentDate).toISOString() : 'None'}\n`);

    // Reset status to DRAFT and clear sentDate
    console.log('📋 Resetting status to DRAFT and clearing sentDate...\n');
    await db.update(clientInvoices)
      .set({
        status: 'DRAFT',
        sentDate: null,
        updatedAt: new Date()
      })
      .where(eq(clientInvoices.id, invoice.id))
      .run();

    console.log('✅ Invoice #200 reset successfully!');
    console.log('   Status: DRAFT');
    console.log('   Sent Date: Cleared');
    console.log('\n   You can now try sending the invoice again.');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error resetting invoice:', error);
    if (error instanceof Error) {
      console.error('Error details:', error.message);
      if (error.stack) {
        console.error('Stack:', error.stack);
      }
    }
    process.exit(1);
  } finally {
    sqliteDb.close();
  }
}

resetInvoice200().catch((error) => {
  console.error('Unhandled error:', error);
  process.exit(1);
});








