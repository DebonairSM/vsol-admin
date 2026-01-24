/**
 * Hard-delete a payroll cycle and all dependent records.
 *
 * Usage: npx tsx apps/api/scripts/hard-delete-cycle.ts <cycle-id>
 * Example: npx tsx apps/api/scripts/hard-delete-cycle.ts 125
 */

import { initializeDatabase, sqliteDb } from '../src/db';
import { fileStorage } from '../src/lib/file-storage';

async function hardDeleteCycle(cycleId: number) {
  try {
    await initializeDatabase();

    const cycle = sqliteDb
      .prepare('SELECT id, month_label FROM payroll_cycles WHERE id = ?')
      .get(cycleId) as { id: number; month_label: string } | undefined;

    if (!cycle) {
      console.error(`❌ Cycle ${cycleId} not found`);
      process.exit(1);
      return;
    }

    console.log(`🧹 Hard-deleting cycle ${cycleId} (${cycle.month_label})...`);

    // Delete consultant invoice files (uploads)
    const invoices = sqliteDb
      .prepare('SELECT id, file_path FROM invoices WHERE cycle_id = ?')
      .all(cycleId) as Array<{ id: number; file_path: string | null }>;
    for (const invoice of invoices) {
      if (invoice.file_path) {
        try {
          await fileStorage.deleteFile(invoice.file_path);
          console.log(`   ✅ Deleted invoice file: ${invoice.file_path}`);
        } catch {
          console.log(`   ⚠️  Could not delete invoice file: ${invoice.file_path} (may not exist)`);
        }
      }
    }

    // Delete client invoice line items
    const clientInvoiceIds = sqliteDb
      .prepare('SELECT id FROM client_invoices WHERE cycle_id = ?')
      .all(cycleId) as Array<{ id: number }>;
    if (clientInvoiceIds.length > 0) {
      const ids = clientInvoiceIds.map((row) => row.id);
      const placeholders = ids.map(() => '?').join(', ');
      sqliteDb
        .prepare(`DELETE FROM invoice_line_items WHERE invoice_id IN (${placeholders})`)
        .run(...ids);
    }

    // Delete dependent records (order matters for FKs)
    sqliteDb.prepare('DELETE FROM invoices WHERE cycle_id = ?').run(cycleId);
    sqliteDb.prepare('DELETE FROM payments WHERE cycle_id = ?').run(cycleId);
    sqliteDb.prepare('DELETE FROM audit_logs WHERE cycle_id = ?').run(cycleId);
    sqliteDb.prepare('DELETE FROM bonus_workflows WHERE cycle_id = ?').run(cycleId);
    sqliteDb.prepare('DELETE FROM cycle_line_items WHERE cycle_id = ?').run(cycleId);
    sqliteDb.prepare('DELETE FROM client_invoices WHERE cycle_id = ?').run(cycleId);

    // Finally delete the cycle
    sqliteDb.prepare('DELETE FROM payroll_cycles WHERE id = ?').run(cycleId);

    console.log(`✅ Hard-deleted cycle ${cycleId} (${cycle.month_label}).`);
    process.exit(0);
  } catch (error) {
    console.error('❌ Error hard-deleting cycle:', error);
    if (error instanceof Error) {
      console.error('Error details:', error.message);
      if (error.stack) {
        console.error('Stack:', error.stack);
      }
    }
    process.exit(1);
  }
}

const cycleId = process.argv[2] ? parseInt(process.argv[2], 10) : null;
if (!cycleId || Number.isNaN(cycleId)) {
  console.error('❌ Usage: npx tsx apps/api/scripts/hard-delete-cycle.ts <cycle-id>');
  process.exit(1);
}

hardDeleteCycle(cycleId).catch((error) => {
  console.error('Unhandled error:', error);
  process.exit(1);
});
