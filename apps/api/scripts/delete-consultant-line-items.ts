/**
 * Delete all cycle line items for a consultant (use with care).
 *
 * Usage: npx tsx apps/api/scripts/delete-consultant-line-items.ts <consultant-id> [cycle-id]
 * Example: npx tsx apps/api/scripts/delete-consultant-line-items.ts 12
 * Example: npx tsx apps/api/scripts/delete-consultant-line-items.ts 12 125
 */

import { initializeDatabase, sqliteDb } from '../src/db';

async function deleteConsultantLineItems(consultantId: number, cycleId?: number) {
  try {
    await initializeDatabase();

    const consultant = sqliteDb
      .prepare('SELECT id, name FROM consultants WHERE id = ?')
      .get(consultantId) as { id: number; name: string } | undefined;

    if (!consultant) {
      console.error(`❌ Consultant with ID ${consultantId} not found`);
      process.exit(1);
      return;
    }

    const countRow = cycleId
      ? sqliteDb
          .prepare('SELECT COUNT(*) as count FROM cycle_line_items WHERE consultant_id = ? AND cycle_id = ?')
          .get(consultantId, cycleId)
      : sqliteDb
          .prepare('SELECT COUNT(*) as count FROM cycle_line_items WHERE consultant_id = ?')
          .get(consultantId);
    const count = countRow?.count || 0;

    if (count === 0) {
      const cycleLabel = cycleId ? ` in cycle ${cycleId}` : '';
      console.log(`No cycle line items found for consultant ${consultant.name} (ID: ${consultantId})${cycleLabel}.`);
      process.exit(0);
      return;
    }

    if (cycleId) {
      sqliteDb
        .prepare('DELETE FROM cycle_line_items WHERE consultant_id = ? AND cycle_id = ?')
        .run(consultantId, cycleId);
    } else {
      sqliteDb
        .prepare('DELETE FROM cycle_line_items WHERE consultant_id = ?')
        .run(consultantId);
    }

    const cycleLabel = cycleId ? ` in cycle ${cycleId}` : '';
    console.log(`✅ Deleted ${count} cycle line item(s) for ${consultant.name} (ID: ${consultantId})${cycleLabel}.`);
    process.exit(0);
  } catch (error) {
    console.error('❌ Error deleting consultant line items:', error);
    if (error instanceof Error) {
      console.error('Error details:', error.message);
      if (error.stack) {
        console.error('Stack:', error.stack);
      }
    }
    process.exit(1);
  }
}

const consultantId = process.argv[2] ? parseInt(process.argv[2], 10) : null;
const cycleId = process.argv[3] ? parseInt(process.argv[3], 10) : undefined;
if (!consultantId || Number.isNaN(consultantId)) {
  console.error('❌ Usage: npx tsx apps/api/scripts/delete-consultant-line-items.ts <consultant-id> [cycle-id]');
  process.exit(1);
}
if (cycleId !== undefined && (Number.isNaN(cycleId) || cycleId < 1)) {
  console.error('❌ Invalid cycle-id:', process.argv[3]);
  process.exit(1);
}

deleteConsultantLineItems(consultantId, cycleId).catch((error) => {
  console.error('Unhandled error:', error);
  process.exit(1);
});
