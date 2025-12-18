import { db, clientInvoices, sqliteDb, initializeDatabase } from '../src/db';
import { ClientInvoiceService } from '../src/services/client-invoice-service';
import { eq } from 'drizzle-orm';

async function syncInvoice200Bonus() {
  try {
    const invoiceNumberArg = process.argv[2];
    const invoiceNumber = invoiceNumberArg ? Number(invoiceNumberArg) : 200;

    if (!Number.isFinite(invoiceNumber) || invoiceNumber <= 0) {
      console.log('❌ Invalid invoice number. Usage: pnpm -C apps/api tsx scripts/sync-invoice-200-bonus.ts [invoiceNumber]');
      process.exit(1);
      return;
    }

    console.log(`🔧 Syncing "Consultant Bonus" for Invoice #${invoiceNumber}...\n`);

    // Initialize database
    await initializeDatabase();

    // Find invoice by invoice number
    const invoice = await db.query.clientInvoices.findFirst({
      where: eq(clientInvoices.invoiceNumber, invoiceNumber),
      with: {
        lineItems: true
      }
    });

    if (!invoice) {
      console.log(`❌ No invoice found for invoice number ${invoiceNumber}`);
      process.exit(1);
      return;
    }

    console.log(`✓ Found Invoice #${invoice.invoiceNumber} (ID: ${invoice.id})`);
    console.log(`   Cycle ID: ${invoice.cycleId || 'None'}`);
    console.log(`   Current line items: ${invoice.lineItems?.length || 0}\n`);

    if (!invoice.cycleId) {
      console.log('❌ Invoice has no associated cycle');
      process.exit(1);
      return;
    }

    // Sync bonus
    console.log('📋 Syncing bonus from cycle.invoiceBonus (or Wave default)...\n');
    const updated = await ClientInvoiceService.syncInvoiceBonusFromCycle(invoice.id);

    console.log('✅ Bonus synced successfully!');
    console.log(`   Updated line items: ${updated.lineItems?.length || 0}\n`);

    if (updated.lineItems) {
      const bonusItem = updated.lineItems.find((item: any) => item.serviceName === 'Consultant Bonus');
      if (bonusItem) {
        console.log('✓ Bonus line item found:');
        console.log(`   Service: ${bonusItem.serviceName}`);
        console.log(`   Amount: $${bonusItem.amount.toFixed(2)}`);
        console.log(`   Description: ${bonusItem.description}`);
      } else {
        console.log('⚠️  No bonus line item found (cycle may not have invoiceBonus set)');
      }
    }

    console.log(`\n✅ Invoice #${invoice.invoiceNumber} bonus sync complete!`);
    process.exit(0);
  } catch (error) {
    console.error('❌ Error syncing bonus:', error);
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

syncInvoice200Bonus().catch((error) => {
  console.error('Unhandled error:', error);
  process.exit(1);
});

