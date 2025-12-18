import { db, consultants, initializeDatabase, sqliteDb } from '../src/db';
import { eq } from 'drizzle-orm';

/**
 * Apply Omnigo client invoice billing fields (service name, base description, unit price)
 * based on the real invoice data provided by the user.
 *
 * This does NOT change consultant payout rates. It only updates:
 * - consultants.clientInvoiceServiceName
 * - consultants.clientInvoiceServiceDescription
 * - consultants.clientInvoiceUnitPrice
 *
 * Usage:
 *   pnpm --filter api tsx scripts/apply-omnigo-client-billing.ts
 */

type BillingMapping = {
  consultantName: string;
  serviceName: string;
  baseDescription: string;
  unitPrice: number;
};

const mappings: BillingMapping[] = [
  {
    consultantName: 'Rafael Celegato',
    serviceName: 'NIBRS Contractor Tech Lead',
    baseDescription:
      'Performs technical leadership functions related and not limited to architecturel and stack suggestions to EAC, checkins, staff mentoring and onboarding directions, product release, QA cordination, coordinating meetings when needed',
    unitPrice: 8655.23
  },
  {
    consultantName: 'Gustavo Moutella Vilela',
    serviceName: 'Principle Software Developer',
    baseDescription: 'Experienced Senior Developer with leadership skills',
    unitPrice: 8115.22
  },
  {
    consultantName: 'Fabiano Louback Gonçalves',
    serviceName: 'Senior Software Developer I',
    baseDescription: 'Senior Software Developer monthly service fee',
    unitPrice: 5410.77
  },
  {
    consultantName: 'Lucas R. L. Martins',
    serviceName: 'Senior Software Developer I',
    baseDescription: 'Senior Software Developer monthly service fee',
    unitPrice: 5410.77
  },
  {
    consultantName: 'Kristof Berge',
    serviceName: 'Software Developer I',
    baseDescription: '3+ years developing .NET applications and 2+ years of advanced JQuery',
    unitPrice: 4250.13
  },
  {
    consultantName: 'Fernando Motta',
    serviceName: 'QA Tester',
    baseDescription: 'QA functional tester',
    unitPrice: 3250.53
  },
  {
    consultantName: 'Guilherme Martini Bronzatti',
    serviceName: 'QA Tester',
    baseDescription: 'QA functional tester',
    unitPrice: 3250.53
  },
  {
    consultantName: 'Enzo Gehlen',
    serviceName: 'Senior Software Developer II',
    baseDescription: 'Business analysis experience with 5+ years of ASP.NET experience or 8+ years in other desired technologies',
    unitPrice: 6145.65
  },
  {
    consultantName: 'Arthur Felix',
    serviceName: 'NIBRS Contractor Senior',
    baseDescription: 'Excellent English skills with a high level of self-management with leadership potential. 10+ years of .NET experience',
    unitPrice: 8115.22
  },
  {
    consultantName: 'Tiago Lima',
    serviceName: 'Senior Software Developer I',
    baseDescription: '5+ years of ASP.NET or 6+ years in other desired technologies',
    unitPrice: 5410.77
  }
];

async function applyOmnigoClientBilling() {
  try {
    console.log('🧾 Applying Omnigo client billing fields...\n');
    await initializeDatabase();

    const all = await db.query.consultants.findMany();
    let updated = 0;
    let missing = 0;

    for (const m of mappings) {
      const c = all.find((x) => x.name === m.consultantName);
      if (!c) {
        missing++;
        console.log(`⚠️  Consultant not found: "${m.consultantName}"`);
        continue;
      }

      await db
        .update(consultants)
        .set({
          clientInvoiceServiceName: m.serviceName,
          clientInvoiceServiceDescription: m.baseDescription,
          clientInvoiceUnitPrice: m.unitPrice,
          // keep legacy fields aligned for convenience (does not affect invoice generation anymore)
          role: m.serviceName,
          serviceDescription: m.baseDescription,
          updatedAt: new Date()
        })
        .where(eq(consultants.id, c.id))
        .run();

      updated++;
      console.log(`✓ ${m.consultantName}: ${m.serviceName} @ $${m.unitPrice.toFixed(2)}`);
    }

    console.log(`\n✅ Updated ${updated} consultant(s)`);
    if (missing > 0) console.log(`⚠️  Missing ${missing} consultant(s) by exact name match`);
  } finally {
    sqliteDb.close();
  }
}

applyOmnigoClientBilling().catch((err) => {
  console.error('❌ Failed to apply Omnigo client billing fields:', err);
  process.exit(1);
});


