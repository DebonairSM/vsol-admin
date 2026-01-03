import { db, payrollCycles, initializeDatabase } from '../src/db';
import { desc, eq } from 'drizzle-orm';
import {
  addMonthsToYearMonth,
  formatMonthLabel,
  getYearMonthFromDate,
  parseMonthLabel
} from '@vsol-admin/shared';

type CycleRow = {
  id: number;
  monthLabel: string;
  createdAt: Date;
  updatedAt: Date;
  archivedAt: Date | null;
};

type PlannedAction =
  | { cycleId: number; action: 'NO_CHANGE'; oldLabel: string; targetLabel: string; archive: false }
  | { cycleId: number; action: 'UPDATE_LABEL'; oldLabel: string; targetLabel: string; archive: false }
  | { cycleId: number; action: 'ARCHIVE'; oldLabel: string; targetLabel: string; archive: true }
  | { cycleId: number; action: 'ARCHIVE_AND_UPDATE_LABEL'; oldLabel: string; targetLabel: string; archive: true };

function parseOverrideArg(raw: string): { cycleId: number; monthLabel: string } {
  // Expected format: "<cycleId>=<Month YYYY>" (Month YYYY may contain spaces, so caller should quote it)
  const idx = raw.indexOf('=');
  if (idx <= 0) {
    throw new Error(`Invalid --override value "${raw}". Expected "<cycleId>=<Month YYYY>"`);
  }
  const cycleIdStr = raw.slice(0, idx).trim();
  const monthLabel = raw.slice(idx + 1).trim();
  const cycleId = parseInt(cycleIdStr, 10);
  if (!Number.isInteger(cycleId) || cycleId <= 0) {
    throw new Error(`Invalid --override cycleId "${cycleIdStr}". Expected a positive integer.`);
  }
  if (!parseMonthLabel(monthLabel)) {
    throw new Error(`Invalid --override month label "${monthLabel}". Expected "Month YYYY".`);
  }
  return { cycleId, monthLabel };
}

function computeTargetLabel(cycle: CycleRow, overridesByCycleId: Map<number, string>): string {
  const override = overridesByCycleId.get(cycle.id);
  if (override) return override;

  const { year, month } = getYearMonthFromDate(cycle.createdAt);
  const next = addMonthsToYearMonth(year, month, 1);
  return formatMonthLabel(next.year, next.month);
}

function parseArgs(argv: string[]) {
  let apply = false;
  const overridesByCycleId = new Map<number, string>();

  const args = argv.slice(2);
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--apply') {
      apply = true;
      continue;
    }
    if (a === '--override') {
      const next = args[i + 1];
      if (!next) {
        throw new Error('--override requires a value like "1=November 2025"');
      }
      const parsed = parseOverrideArg(next);
      overridesByCycleId.set(parsed.cycleId, parsed.monthLabel);
      i++;
      continue;
    }
    throw new Error(`Unknown arg: ${a}`);
  }

  const dryRun = !apply;
  return { apply, dryRun, overridesByCycleId };
}

function printUsageAndExit(): never {
  console.error('Usage: tsx scripts/fix-cycle-month-labels.ts [--apply]');
  console.error('       tsx scripts/fix-cycle-month-labels.ts [--apply] --override \"<cycleId>=<Month YYYY>\"');
  console.error('');
  console.error('Default is dry-run (no writes). Use --apply to execute updates.');
  console.error('You can pass --override multiple times.');
  process.exit(1);
}

async function loadCycles(): Promise<CycleRow[]> {
  return db.query.payrollCycles.findMany({
    columns: {
      id: true,
      monthLabel: true,
      createdAt: true,
      updatedAt: true,
      archivedAt: true
    },
    orderBy: [desc(payrollCycles.createdAt)]
  }) as unknown as CycleRow[];
}

function planActions(
  cycles: CycleRow[],
  overridesByCycleId: Map<number, string>
): { actions: PlannedAction[]; collisions: Array<{ label: string; activeCount: number }> } {
  const byTarget = new Map<string, CycleRow[]>();
  for (const cycle of cycles) {
    const targetLabel = computeTargetLabel(cycle, overridesByCycleId);
    const list = byTarget.get(targetLabel) ?? [];
    list.push(cycle);
    byTarget.set(targetLabel, list);
  }

  const actions: PlannedAction[] = [];
  const collisions: Array<{ label: string; activeCount: number }> = [];

  for (const [targetLabel, group] of byTarget.entries()) {
    const active = group.filter((c) => c.archivedAt == null);
    if (active.length > 1) {
      collisions.push({ label: targetLabel, activeCount: active.length });
    }

    // Keep newest active cycle for this label; archive older active cycles.
    const newestActive =
      active.length === 0
        ? null
        : active.reduce((best, cur) => (cur.createdAt > best.createdAt ? cur : best), active[0]);

    for (const cycle of group) {
      const shouldArchive = cycle.archivedAt == null && newestActive != null && cycle.id !== newestActive.id;
      const needsLabelUpdate = cycle.monthLabel !== targetLabel;

      if (shouldArchive && needsLabelUpdate) {
        actions.push({
          cycleId: cycle.id,
          action: 'ARCHIVE_AND_UPDATE_LABEL',
          oldLabel: cycle.monthLabel,
          targetLabel,
          archive: true
        });
      } else if (shouldArchive) {
        actions.push({
          cycleId: cycle.id,
          action: 'ARCHIVE',
          oldLabel: cycle.monthLabel,
          targetLabel,
          archive: true
        });
      } else if (needsLabelUpdate) {
        actions.push({
          cycleId: cycle.id,
          action: 'UPDATE_LABEL',
          oldLabel: cycle.monthLabel,
          targetLabel,
          archive: false
        });
      } else {
        actions.push({
          cycleId: cycle.id,
          action: 'NO_CHANGE',
          oldLabel: cycle.monthLabel,
          targetLabel,
          archive: false
        });
      }
    }
  }

  // stable output (ascending cycleId)
  actions.sort((a, b) => a.cycleId - b.cycleId);
  collisions.sort((a, b) => a.label.localeCompare(b.label));

  return { actions, collisions };
}

function printReport(actions: PlannedAction[], collisions: Array<{ label: string; activeCount: number }>) {
  const counts = actions.reduce(
    (acc, a) => {
      acc[a.action] = (acc[a.action] ?? 0) + 1;
      return acc;
    },
    {} as Record<PlannedAction['action'], number>
  );

  console.log('Planned cycle month-label fixes');
  console.log('--------------------------------');
  console.log(`NO_CHANGE: ${counts.NO_CHANGE ?? 0}`);
  console.log(`UPDATE_LABEL: ${counts.UPDATE_LABEL ?? 0}`);
  console.log(`ARCHIVE: ${counts.ARCHIVE ?? 0}`);
  console.log(`ARCHIVE_AND_UPDATE_LABEL: ${counts.ARCHIVE_AND_UPDATE_LABEL ?? 0}`);
  console.log('');

  if (collisions.length) {
    console.log('Collisions (multiple active cycles map to same targetLabel):');
    for (const c of collisions) {
      console.log(`- ${c.label}: ${c.activeCount} active cycles (will archive older ones)`);
    }
    console.log('');
  }

  console.log('Details:');
  for (const a of actions) {
    const suffix = a.oldLabel === a.targetLabel ? '' : ` "${a.oldLabel}" -> "${a.targetLabel}"`;
    console.log(`${String(a.cycleId).padStart(4, ' ')}  ${a.action}${suffix}`);
  }
}

async function applyActions(actions: PlannedAction[]) {
  const now = new Date();

  // Small safety check: if there are zero changes, exit early
  const willWrite = actions.some((a) => a.action !== 'NO_CHANGE');
  if (!willWrite) {
    console.log('No changes to apply.');
    return;
  }

  // Note: better-sqlite3 transactions must be synchronous. Do not make this callback async.
  db.transaction((tx) => {
    for (const a of actions) {
      if (a.action === 'NO_CHANGE') continue;

      const set: Partial<CycleRow> & { updatedAt: Date } = { updatedAt: now } as any;
      if (a.action === 'UPDATE_LABEL' || a.action === 'ARCHIVE_AND_UPDATE_LABEL') {
        (set as any).monthLabel = a.targetLabel;
      }
      if (a.action === 'ARCHIVE' || a.action === 'ARCHIVE_AND_UPDATE_LABEL') {
        (set as any).archivedAt = now;
      }

      // Drizzle better-sqlite3 driver executes synchronously.
      tx.update(payrollCycles).set(set as any).where(eq(payrollCycles.id, a.cycleId)).run();
    }
  });
}

async function main() {
  let apply = false;
  let dryRun = true;
  let overridesByCycleId = new Map<number, string>();
  try {
    const parsed = parseArgs(process.argv);
    apply = parsed.apply;
    dryRun = parsed.dryRun;
    overridesByCycleId = parsed.overridesByCycleId;
  } catch (e) {
    console.error(e instanceof Error ? e.message : String(e));
    printUsageAndExit();
  }

  await initializeDatabase();

  const cycles = await loadCycles();
  if (!cycles.length) {
    console.log('No cycles found.');
    return;
  }

  const { actions, collisions } = planActions(cycles, overridesByCycleId);
  printReport(actions, collisions);

  if (dryRun) {
    console.log('\nDry-run complete. Re-run with --apply to execute.');
    return;
  }

  // Extra guard: avoid applying if there are active cycles without archivedAt but with same current label?
  // Not needed for correctness, but we keep a conservative check that label uniqueness among active cycles is preserved by our plan.
  const afterLabels = new Map<string, number[]>();
  for (const a of actions) {
    const label = a.action === 'UPDATE_LABEL' || a.action === 'ARCHIVE_AND_UPDATE_LABEL' ? a.targetLabel : a.oldLabel;
    const archived = a.action === 'ARCHIVE' || a.action === 'ARCHIVE_AND_UPDATE_LABEL';
    if (archived) continue;
    const list = afterLabels.get(label) ?? [];
    list.push(a.cycleId);
    afterLabels.set(label, list);
  }
  const duplicatesAfter = [...afterLabels.entries()].filter(([, ids]) => ids.length > 1);
  if (duplicatesAfter.length) {
    console.error('Refusing to apply: resulting active label duplicates detected:');
    for (const [label, ids] of duplicatesAfter) {
      console.error(`- "${label}": cycles ${ids.join(', ')}`);
    }
    process.exit(1);
  }

  await applyActions(actions);
  console.log('\nApply complete.');
}

main().catch((error) => {
  console.error('Unhandled error:', error);
  process.exit(1);
});

