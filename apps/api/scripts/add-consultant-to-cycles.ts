import { db, consultants, payrollCycles, cycleLineItems, sqliteDb, initializeDatabase } from '../src/db';
import { LineItemService } from '../src/services/line-item-service';
import { eq, and } from 'drizzle-orm';

/**
 * Add a consultant to specific cycles
 * 
 * This script adds a consultant to payroll cycles by creating line items.
 * It uses the consultant's current hourlyRate as a snapshot.
 */
async function addConsultantToCycles(consultantName: string, cycleIds: number[]) {
  try {
    console.log(`📋 Adding ${consultantName} to cycles ${cycleIds.join(', ')}...\n`);

    // Initialize database (handles encryption if enabled)
    await initializeDatabase();

    // Find consultant by name
    const consultant = await db.query.consultants.findFirst({
      where: eq(consultants.name, consultantName)
    });

    if (!consultant) {
      console.error(`❌ Consultant "${consultantName}" not found`);
      console.error(`   Available consultants:`);
      const allConsultants = await db.query.consultants.findMany();
      allConsultants.forEach(c => {
        console.error(`   - ${c.name} (ID: ${c.id})`);
      });
      process.exit(1);
      return;
    }

    console.log('📊 Consultant details:');
    console.log(`   ID: ${consultant.id}`);
    console.log(`   Name: ${consultant.name}`);
    console.log(`   Hourly Rate: $${consultant.hourlyRate.toFixed(2)}`);

    // Verify cycles exist
    console.log(`\n🔍 Verifying cycles exist...`);
    for (const cycleId of cycleIds) {
      const cycle = await db.query.payrollCycles.findFirst({
        where: eq(payrollCycles.id, cycleId)
      });

      if (!cycle) {
        console.error(`❌ Cycle ${cycleId} not found`);
        process.exit(1);
        return;
      }

      console.log(`   Cycle ${cycleId}: ${cycle.monthLabel}`);

      // Check if consultant already has a line item in this cycle
      const existingLineItem = await db.query.cycleLineItems.findFirst({
        where: and(
          eq(cycleLineItems.cycleId, cycleId),
          eq(cycleLineItems.consultantId, consultant.id)
        )
      });

      if (existingLineItem) {
        console.log(`   ⚠️  ${consultantName} already has a line item in cycle ${cycleId} (ID: ${existingLineItem.id})`);
        continue;
      }

      // Create line item for this cycle
      console.log(`   ➕ Creating line item for cycle ${cycleId}...`);
      const lineItem = await LineItemService.createForConsultant(
        cycleId,
        consultant.id,
        consultant.hourlyRate
      );

      console.log(`   ✅ Created line item ID: ${lineItem.id}`);
    }

    console.log(`\n✅ Successfully added ${consultantName} to cycles ${cycleIds.join(', ')}`);
    process.exit(0);
  } catch (error) {
    console.error('❌ Error adding consultant to cycles:', error);
    if (error instanceof Error) {
      console.error('Error details:', error.message);
      if (error.stack) {
        console.error('Stack:', error.stack);
      }
    }
    process.exit(1);
  }
}

// Get consultant name and cycle IDs from command line arguments
const consultantName = process.argv[2];
const cycleIdsArg = process.argv[3];

if (!consultantName || !cycleIdsArg) {
  console.error('❌ Usage: tsx scripts/add-consultant-to-cycles.ts [consultant-name] [cycle-ids]');
  console.error('   Example: tsx scripts/add-consultant-to-cycles.ts "Arthur Felix" "1,2"');
  console.error('   Note: Cycle IDs should be comma-separated (e.g., "1,2,3")');
  process.exit(1);
}

const cycleIds = cycleIdsArg.split(',').map(id => {
  const parsed = parseInt(id.trim(), 10);
  if (isNaN(parsed)) {
    console.error(`❌ Invalid cycle ID: ${id.trim()}`);
    process.exit(1);
  }
  return parsed;
});

addConsultantToCycles(consultantName, cycleIds).catch((error) => {
  console.error('Unhandled error:', error);
  process.exit(1);
});







