import { db, payrollCycles } from '../src/db';
import { eq } from 'drizzle-orm';

/**
 * Fix cycle 2's globalWorkHours to 160 (November 2025 work hours)
 * 
 * This script updates cycle 2 (November 2025) to have the correct
 * globalWorkHours value of 160, which matches the work hours for November
 * in the monthlyWorkHours table.
 */
async function fixCycle2WorkHours() {
  try {
    // Get cycle 2
    const cycle2 = await db.query.payrollCycles.findFirst({
      where: eq(payrollCycles.id, 2)
    });

    if (!cycle2) {
      console.error('Cycle 2 not found');
      process.exit(1);
    }

    console.log('Current cycle 2 state:');
    console.log(`  Month Label: ${cycle2.monthLabel}`);
    console.log(`  Global Work Hours: ${cycle2.globalWorkHours}`);

    if (cycle2.globalWorkHours === 160) {
      console.log('\n✅ Cycle 2 already has the correct globalWorkHours (160). No changes needed.');
      process.exit(0);
    }

    // Update cycle 2's globalWorkHours to 160
    await db.update(payrollCycles)
      .set({
        globalWorkHours: 160,
        updatedAt: new Date()
      })
      .where(eq(payrollCycles.id, 2));

    // Verify the update
    const updated = await db.query.payrollCycles.findFirst({
      where: eq(payrollCycles.id, 2)
    });

    console.log('\n✅ Successfully updated cycle 2:');
    console.log(`  Month Label: ${updated?.monthLabel}`);
    console.log(`  Global Work Hours: ${updated?.globalWorkHours}`);
    console.log('\nCycle 2 has been updated with globalWorkHours = 160');
  } catch (error) {
    console.error('Error updating cycle 2:', error);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

fixCycle2WorkHours();

