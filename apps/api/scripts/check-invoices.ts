import { db, invoices, clientInvoices } from '../src/db';

async function checkInvoices() {
  console.log('Checking invoices in database...\n');

  // Check legacy invoices
  const legacyInvoices = await db.query.invoices.findMany();
  console.log(`Legacy invoices (invoices table): ${legacyInvoices.length}`);
  if (legacyInvoices.length > 0) {
    console.log('Sample invoices:');
    legacyInvoices.slice(0, 5).forEach(inv => {
      console.log(`  - ID: ${inv.id}, Cycle: ${inv.cycleId}, Consultant: ${inv.consultantId}`);
    });
  }

  // Check client invoices
  const clientInvs = await db.query.clientInvoices.findMany();
  console.log(`\nClient invoices (client_invoices table): ${clientInvs.length}`);
  if (clientInvs.length > 0) {
    console.log('Sample client invoices:');
    clientInvs.slice(0, 5).forEach(inv => {
      console.log(`  - Invoice #${inv.invoiceNumber}, Cycle: ${inv.cycleId}, Status: ${inv.status}`);
    });
  }

  if (legacyInvoices.length === 0 && clientInvs.length === 0) {
    console.log('\n⚠️  No invoices found in either table.');
    console.log('   - Legacy invoices can be created via API POST /api/invoices');
    console.log('   - Client invoices are created from cycles via the workflow tracker');
  }

  process.exit(0);
}

checkInvoices().catch(console.error);

