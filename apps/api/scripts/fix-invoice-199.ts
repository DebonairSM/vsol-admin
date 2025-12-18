import { db, consultants, clientInvoices, sqliteDb, initializeDatabase } from '../src/db';
import { ClientInvoiceService } from '../src/services/client-invoice-service';
import { eq } from 'drizzle-orm';

/**
 * Fix Invoice #199 by:
 * 1. Assigning roles to consultants if missing
 * 2. Deleting the existing invoice
 * 3. Recreating it with proper role grouping
 */

interface RoleMapping {
  name: string;
  role: string;
  serviceDescription: string;
  clientInvoiceUnitPrice: number;
}

const roleMappings: RoleMapping[] = [
  {
    name: 'Rafael Celegato',
    role: 'NIBRS Contractor Tech Lead',
    serviceDescription: 'Performs technical leadership functions related and not limited to architecturel and stack suggestions to EAC, checkins, staff mentoring and onboarding directions, product release, QA cordination, coordinating meetings when needed',
    clientInvoiceUnitPrice: 8655.23
  },
  {
    name: 'Gustavo Moutella Vilela',
    role: 'Principle Software Developer',
    serviceDescription: 'Experienced Senior Developer with leadership skills',
    clientInvoiceUnitPrice: 8115.22
  },
  {
    name: 'Fabiano Louback Gonçalves',
    role: 'Senior Software Developer I',
    serviceDescription: 'Senior Software Developer monthly service fee',
    clientInvoiceUnitPrice: 5410.77
  },
  {
    name: 'Lucas R. L. Martins',
    role: 'Senior Software Developer I',
    serviceDescription: 'Senior Software Developer monthly service fee',
    clientInvoiceUnitPrice: 5410.77
  },
  {
    name: 'Kristof Berge',
    role: 'Software Developer I',
    serviceDescription: '3+ years developing .NET applications and 2+ years of advanced JQuery',
    clientInvoiceUnitPrice: 4250.13
  },
  {
    name: 'Fernando Motta',
    role: 'QA Tester',
    serviceDescription: 'QA functional tester',
    clientInvoiceUnitPrice: 3250.53
  },
  {
    name: 'Guilherme Martini Bronzatti',
    role: 'QA Tester',
    serviceDescription: 'QA functional tester',
    clientInvoiceUnitPrice: 3250.53
  },
  {
    name: 'Enzo Gehlen',
    role: 'Senior Software Developer II',
    serviceDescription: 'Business analysis experience with 5+ years of ASP.NET experience or 8+ years in other desired technologies',
    clientInvoiceUnitPrice: 6145.65
  },
  {
    name: 'Arthur Felix',
    role: 'NIBRS Contractor Senior',
    serviceDescription: 'Excellent English skills with a high level of self-management with leadership potential. 10+ years of .NET experience',
    clientInvoiceUnitPrice: 8115.22
  },
  {
    name: 'Tiago Lima',
    role: 'Senior Software Developer I',
    serviceDescription: '5+ years of ASP.NET or 6+ years in other desired technologies',
    clientInvoiceUnitPrice: 5410.77
  }
];

async function fixInvoice199() {
  try {
    console.log('🔧 Fixing Invoice #199...\n');

    // Initialize database
    await initializeDatabase();

    // Step 1: Assign roles to consultants
    console.log('📋 Step 1: Assigning roles to consultants...\n');
    const allConsultants = await db.query.consultants.findMany();
    let rolesAssigned = 0;

    for (const mapping of roleMappings) {
      const consultant = allConsultants.find(c => c.name === mapping.name);
      if (!consultant) {
        console.log(`⚠️  Consultant "${mapping.name}" not found`);
        continue;
      }

      const alreadySet =
        consultant.role === mapping.role &&
        consultant.serviceDescription === mapping.serviceDescription &&
        consultant.clientInvoiceServiceName === mapping.role &&
        consultant.clientInvoiceServiceDescription === mapping.serviceDescription &&
        consultant.clientInvoiceUnitPrice === mapping.clientInvoiceUnitPrice;

      if (alreadySet) {
        console.log(`✓ ${mapping.name}: Already has correct invoice fields`);
        continue;
      }

      await db.update(consultants)
        .set({
          role: mapping.role,
          serviceDescription: mapping.serviceDescription,
          clientInvoiceServiceName: mapping.role,
          clientInvoiceServiceDescription: mapping.serviceDescription,
          clientInvoiceUnitPrice: mapping.clientInvoiceUnitPrice,
          updatedAt: new Date()
        })
        .where(eq(consultants.id, consultant.id))
        .run();

      rolesAssigned++;
      console.log(`✓ ${mapping.name}: Assigned role "${mapping.role}"`);
    }

    console.log(`\n✅ Assigned roles to ${rolesAssigned} consultants\n`);

    // Step 2: Find Invoice #199
    console.log('📋 Step 2: Finding Invoice #199...\n');
    const invoice = await db.query.clientInvoices.findFirst({
      where: eq(clientInvoices.invoiceNumber, 199),
      with: {
        cycle: true
      }
    });

    if (!invoice) {
      console.log('❌ Invoice #199 not found');
      console.log('   You may need to create it first from the cycle');
      process.exit(1);
      return;
    }

    console.log(`✓ Found Invoice #199 (ID: ${invoice.id})`);
    console.log(`   Cycle: ${invoice.cycle?.monthLabel || 'Unknown'}`);
    console.log(`   Status: ${invoice.status}\n`);

    // Step 3: Delete the invoice
    console.log('📋 Step 3: Deleting Invoice #199...\n');
    await ClientInvoiceService.delete(invoice.id);
    console.log('✅ Invoice #199 deleted\n');

    // Step 4: Recreate the invoice
    if (!invoice.cycleId) {
      console.log('❌ Invoice has no cycleId, cannot recreate');
      process.exit(1);
      return;
    }

    console.log(`📋 Step 4: Recreating Invoice #199 from cycle ${invoice.cycleId}...\n`);
    const newInvoice = await ClientInvoiceService.createFromCycle(invoice.cycleId);
    
    console.log('✅ Invoice recreated successfully!');
    console.log(`   New Invoice Number: #${newInvoice.invoiceNumber}`);
    console.log(`   Invoice ID: ${newInvoice.id}`);
    console.log(`   Line Items: ${newInvoice.lineItems?.length || 0}`);
    
    if (newInvoice.lineItems && newInvoice.lineItems.length > 0) {
      console.log('\n   Line Items:');
      newInvoice.lineItems.forEach((item: any, index: number) => {
        console.log(`   ${index + 1}. ${item.serviceName} (Qty: ${item.quantity}, Rate: $${item.rate.toFixed(2)})`);
      });
    }

    console.log('\n✅ Invoice #199 fixed successfully!');
    console.log('   The invoice now has proper role grouping matching Wave format.');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error fixing invoice:', error);
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

fixInvoice199().catch((error) => {
  console.error('Unhandled error:', error);
  process.exit(1);
});

