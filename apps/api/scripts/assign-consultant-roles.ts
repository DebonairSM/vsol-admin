import { db, consultants, sqliteDb, initializeDatabase } from '../src/db';
import { eq } from 'drizzle-orm';

/**
 * Assign roles and service descriptions to consultants based on Invoice #198
 * 
 * This script bulk updates consultant role and serviceDescription fields
 * to enable proper grouping in invoices.
 */
interface RoleMapping {
  name: string;
  role: string;
  serviceDescription: string;
}

const roleMappings: RoleMapping[] = [
  {
    name: 'Rafael Celegato',
    role: 'NIBRS Contractor Tech Lead',
    serviceDescription: 'Performs technical leadership functions related and not limited to architecturel and stack suggestions to EAC, checkins, staff mentoring and onboarding directions, product release, QA cordination, coordinating meetings when needed'
  },
  {
    name: 'Gustavo Moutella Vilela',
    role: 'Principle Software Developer',
    serviceDescription: 'Experienced Senior Developer with leadership skills'
  },
  {
    name: 'Fabiano Louback Gonçalves',
    role: 'Senior Software Developer I',
    serviceDescription: 'Senior Software Developer monthly service fee'
  },
  {
    name: 'Lucas R. L. Martins',
    role: 'Senior Software Developer I',
    serviceDescription: 'Senior Software Developer monthly service fee'
  },
  {
    name: 'Kristof Berge',
    role: 'Software Developer I',
    serviceDescription: '3+ years developing .NET applications and 2+ years of advanced JQuery'
  },
  {
    name: 'Fernando Motta',
    role: 'QA Tester',
    serviceDescription: 'QA functional tester'
  },
  {
    name: 'Guilherme Martini Bronzatti',
    role: 'QA Tester',
    serviceDescription: 'QA functional tester'
  },
  {
    name: 'Enzo Gehlen',
    role: 'Senior Software Developer II',
    serviceDescription: 'Business analysis experience with 5+ years of ASP.NET experience or 8+ years in other desired technologies'
  },
  {
    name: 'Arthur Felix',
    role: 'NIBRS Contractor Senior',
    serviceDescription: 'Excellent English skills with a high level of self-management with leadership potential. 10+ years of .NET experience'
  },
  {
    name: 'Tiago Lima',
    role: 'Senior Software Developer I',
    serviceDescription: '5+ years of ASP.NET or 6+ years in other desired technologies'
  }
];

async function assignConsultantRoles() {
  try {
    console.log('🔧 Assigning roles and service descriptions to consultants...\n');

    // Initialize database (handles encryption if enabled)
    await initializeDatabase();

    // Get all consultants
    const allConsultants = await db.query.consultants.findMany({
      orderBy: (consultants, { asc }) => [asc(consultants.name)]
    });

    console.log(`📊 Found ${allConsultants.length} consultants in database\n`);

    const results = {
      updated: 0,
      notFound: [] as string[],
      skipped: [] as string[],
      errors: [] as Array<{ name: string; error: string }>
    };

    // Process each role mapping
    for (const mapping of roleMappings) {
      const consultant = allConsultants.find(c => c.name === mapping.name);

      if (!consultant) {
        results.notFound.push(mapping.name);
        console.log(`⚠️  Consultant "${mapping.name}" not found in database`);
        continue;
      }

      // Check if already has the same role and description
      if (consultant.role === mapping.role && consultant.serviceDescription === mapping.serviceDescription) {
        results.skipped.push(mapping.name);
        console.log(`⏭️  ${mapping.name}: Already has role "${mapping.role}" and matching description (skipped)`);
        continue;
      }

      // Show before/after
      console.log(`\n📝 Updating ${mapping.name}:`);
      console.log(`   Current role: ${consultant.role || '(none)'}`);
      console.log(`   New role: ${mapping.role}`);
      if (consultant.serviceDescription !== mapping.serviceDescription) {
        console.log(`   Current description: ${consultant.serviceDescription || '(none)'}`);
        console.log(`   New description: ${mapping.serviceDescription}`);
      }

      try {
        // Update consultant
        await db.update(consultants)
          .set({
            role: mapping.role,
            serviceDescription: mapping.serviceDescription,
            updatedAt: new Date()
          })
          .where(eq(consultants.id, consultant.id));

        results.updated++;
        console.log(`   ✅ Updated successfully`);
      } catch (error: any) {
        results.errors.push({
          name: mapping.name,
          error: error.message || 'Unknown error'
        });
        console.log(`   ❌ Error: ${error.message || 'Unknown error'}`);
      }
    }

    // Show summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 Summary:');
    console.log(`   ✅ Updated: ${results.updated}`);
    console.log(`   ⏭️  Skipped (already correct): ${results.skipped.length}`);
    if (results.skipped.length > 0) {
      results.skipped.forEach(name => console.log(`      - ${name}`));
    }
    if (results.notFound.length > 0) {
      console.log(`   ⚠️  Not found: ${results.notFound.length}`);
      results.notFound.forEach(name => console.log(`      - ${name}`));
    }
    if (results.errors.length > 0) {
      console.log(`   ❌ Errors: ${results.errors.length}`);
      results.errors.forEach(({ name, error }) => {
        console.log(`      - ${name}: ${error}`);
      });
    }
    console.log('='.repeat(60));

    // Show consultants without roles (not in mapping)
    const consultantsWithoutRoles = allConsultants.filter(c => {
      const hasMapping = roleMappings.some(m => m.name === c.name);
      return !hasMapping && (!c.role || c.role === 'Uncategorized');
    });

    if (consultantsWithoutRoles.length > 0) {
      console.log(`\n⚠️  Consultants without roles assigned (${consultantsWithoutRoles.length}):`);
      consultantsWithoutRoles.forEach(c => {
        console.log(`   - ${c.name} (current role: ${c.role || '(none)'})`);
      });
    }

    console.log('\n✅ Role assignment complete!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error assigning roles:', error);
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

// Check if running with a specific consultant name argument
const consultantNameArg = process.argv[2];

if (consultantNameArg) {
  // Update single consultant
  const mapping = roleMappings.find(m => 
    m.name.toLowerCase().includes(consultantNameArg.toLowerCase()) ||
    consultantNameArg.toLowerCase().includes(m.name.toLowerCase())
  );

  if (!mapping) {
    console.error(`❌ No role mapping found for "${consultantNameArg}"`);
    console.error('Available consultants in mapping:');
    roleMappings.forEach(m => console.error(`   - ${m.name}`));
    process.exit(1);
  }

  // Filter to just this consultant
  const originalMappings = [...roleMappings];
  roleMappings.length = 0;
  roleMappings.push(mapping);
  
  assignConsultantRoles().catch((error) => {
    console.error('Unhandled error:', error);
    process.exit(1);
  });
} else {
  // Update all consultants
  assignConsultantRoles().catch((error) => {
    console.error('Unhandled error:', error);
    process.exit(1);
  });
}












