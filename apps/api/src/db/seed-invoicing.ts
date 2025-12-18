import { db, companies, clients, invoiceNumberSequence } from './index';

/**
 * Seed invoicing system data (company and client information)
 * This should be run after the database schema is set up
 */
export async function seedInvoicing() {
  console.log('🌱 Seeding invoicing system data...');

  try {
    // Check if company already exists
    const existingCompany = await db.query.companies.findFirst();
    
    if (!existingCompany) {
      console.log('  Creating company (VSol Software)...');
      await db.insert(companies).values({
        name: 'VSol Software',
        legalName: 'Visual Solutions Software',
        address: '3111 N University Dr. Ste 105',
        city: 'Coral Springs',
        state: 'Florida',
        zip: '33065',
        country: 'United States',
        phone: '+14074060206',
        website: 'www.vsol.software',
        floridaTaxId: 'L16000173993',
        federalTaxId: '81-3904929'
      });
      console.log('  ✓ Company created');
    } else {
      console.log('  ⏭ Company already exists, skipping');
    }

    // Check if client already exists
    const existingClient = await db.query.clients.findFirst();
    
    if (!existingClient) {
      console.log('  Creating client (Omnigo Software)...');
      await db.insert(clients).values({
        name: 'Omnigo Software',
        contactName: 'Dawn Echard',
        contactPhone: '1.866.421.2374 x5578',
        contactEmail: 'apmailbox@omnigo.com',
        paymentTerms: 'Wells Fargo Account\nRouting: 063107513\nAccount: 3912994617'
      });
      console.log('  ✓ Client created');
    } else {
      console.log('  ⏭ Client already exists, skipping');
    }

    // Check if invoice number sequence exists
    const existingSequence = await db.query.invoiceNumberSequence.findFirst();
    
    if (!existingSequence) {
      console.log('  Creating invoice number sequence (starting at 198)...');
      await db.insert(invoiceNumberSequence).values({
        nextNumber: 198
      });
      console.log('  ✓ Invoice number sequence created');
    } else {
      console.log('  ⏭ Invoice number sequence already exists, skipping');
    }

    console.log('✅ Invoicing system seeding completed');
  } catch (error) {
    console.error('❌ Error seeding invoicing system:', error);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  import('./index').then(async ({ db }) => {
    await seedInvoicing();
    process.exit(0);
  }).catch(error => {
    console.error('Failed to seed invoicing system:', error);
    process.exit(1);
  });
}

