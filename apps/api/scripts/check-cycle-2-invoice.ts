import { db, clientInvoices, sqliteDb, initializeDatabase } from '../src/db';
import { eq } from 'drizzle-orm';

async function checkCycle2Invoice() {
  try {
    await initializeDatabase();

    // Find invoice for cycle 2
    const invoice = await db.query.clientInvoices.findFirst({
      where: eq(clientInvoices.cycleId, 2),
      with: {
        lineItems: true,
        cycle: true
      }
    });

    if (!invoice) {
      console.log('❌ No invoice found for cycle 2');
      process.exit(1);
      return;
    }

    console.log(`✓ Found invoice for cycle 2:`);
    console.log(`   Invoice #: ${invoice.invoiceNumber}`);
    console.log(`   Invoice ID: ${invoice.id}`);
    console.log(`   Cycle: ${invoice.cycle?.monthLabel || 'Unknown'}`);
    console.log(`   Invoice Bonus: ${invoice.cycle?.invoiceBonus || 0}`);
    console.log(`   Line items: ${invoice.lineItems?.length || 0}`);
    
    if (invoice.lineItems) {
      const bonusItem = invoice.lineItems.find((item: any) => item.serviceName === 'Consultant Bonus');
      if (bonusItem) {
        console.log(`\n✓ Bonus line item exists: $${bonusItem.amount.toFixed(2)}`);
      } else {
        console.log(`\n⚠️  No bonus line item found`);
        console.log(`   Cycle invoiceBonus: ${invoice.cycle?.invoiceBonus || 0}`);
      }
    }

    sqliteDb.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkCycle2Invoice();

