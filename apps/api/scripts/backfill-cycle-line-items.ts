/**
 * Backfill missing cycle line items for a cycle created before the fix that
 * executed the line-items insert (see cycle-service.ts).
 *
 * Usage: npx tsx apps/api/scripts/backfill-cycle-line-items.ts <cycleId>
 * Example: npx tsx apps/api/scripts/backfill-cycle-line-items.ts 125
 */

import { db, consultants, payrollCycles, cycleLineItems, initializeDatabase } from '../src/db';
import { eq, and, isNull } from 'drizzle-orm';

async function backfillCycleLineItems(cycleId: number) {
  await initializeDatabase();

  const cycle = await db.query.payrollCycles.findFirst({
    where: eq(payrollCycles.id, cycleId),
    with: { lines: { with: { consultant: true } } }
  });

  if (!cycle) {
    console.error(`Cycle ${cycleId} not found`);
    process.exit(1);
  }

  const activeConsultants = await db.query.consultants.findMany({
    where: isNull(consultants.terminationDate)
  });

  if (activeConsultants.length === 0) {
    console.error('No active consultants found');
    process.exit(1);
  }

  const existingConsultantIds = new Set(cycle.lines.map((l) => l.consultantId));
  const toCreate = activeConsultants.filter((c) => !existingConsultantIds.has(c.id));

  if (toCreate.length === 0) {
    console.log(`Cycle ${cycleId} (${cycle.monthLabel}) already has line items for all ${activeConsultants.length} active consultant(s).`);
    process.exit(0);
  }

  const lineItemsData = toCreate.map((c) => ({
    cycleId,
    consultantId: c.id,
    ratePerHour: c.hourlyRate,
    bonusAdvance: c.yearlyBonus ?? null
  }));

  await db.insert(cycleLineItems).values(lineItemsData);

  console.log(
    `Backfilled ${lineItemsData.length} line item(s) for cycle ${cycleId} (${cycle.monthLabel}): ` +
      toCreate.map((c) => c.name).join(', ')
  );
  process.exit(0);
}

const cycleIdArg = process.argv[2];
if (!cycleIdArg) {
  console.error('Usage: npx tsx apps/api/scripts/backfill-cycle-line-items.ts <cycleId>');
  process.exit(1);
}
const cycleId = parseInt(cycleIdArg, 10);
if (!Number.isFinite(cycleId) || cycleId < 1) {
  console.error('Invalid cycleId:', cycleIdArg);
  process.exit(1);
}

backfillCycleLineItems(cycleId).catch((err) => {
  console.error(err);
  process.exit(1);
});
