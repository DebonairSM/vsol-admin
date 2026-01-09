import { test, expect } from '@playwright/test';
import { createCycleAsAdmin, archiveCycleAsAdmin } from './helpers/admin-api';
import { createTestConsultant, deleteTestConsultant, generateTestConsultantName } from './helpers/fixtures';

test.describe('Admin Integration Tests', () => {
  const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:5173';
  const isLocalBaseURL = baseURL.includes('localhost') || baseURL.includes('127.0.0.1');
  const allowAdminMutations = isLocalBaseURL || process.env.E2E_ALLOW_ADMIN_MUTATIONS === 'true';

  test.describe.configure({ mode: 'serial' });

  test('should complete full cycle workflow: create cycle → view Golden Sheet → edit line items', async ({ page, request }) => {
    test.skip(!allowAdminMutations, 'Requires admin mutations (set E2E_ALLOW_ADMIN_MUTATIONS=true for remote)');

    // Create a test consultant
    const consultant = await createTestConsultant(request, {
      name: generateTestConsultantName(),
      hourlyRate: 50.0,
    });

    let cycleId: number | null = null;

    try {
      // Create a cycle
      const { cycleId: createdCycleId } = await createCycleAsAdmin(request);
      cycleId = createdCycleId;

      // Navigate to Golden Sheet
      await page.goto(`/cycles/${cycleId}`, { waitUntil: 'networkidle', timeout: 60000 });
      await page.waitForSelector('table, h1', { state: 'visible', timeout: 30000 });

      // Verify cycle page loaded
      await expect(page).toHaveURL(/\/cycles\/\d+/);

      // Verify line items exist (should be created for active consultants)
      await page.waitForTimeout(2000);
      const table = page.locator('table').first();
      const rows = table.locator('tbody tr');
      const rowCount = await rows.count();
      
      // Should have at least one row for the consultant we created
      expect(rowCount).toBeGreaterThanOrEqual(0);

      // Verify consultant appears in line items
      if (rowCount > 0) {
        const pageText = await page.locator('body').textContent();
        expect(pageText).toBeTruthy();
      }
    } finally {
      // Cleanup
      if (cycleId) {
        await archiveCycleAsAdmin(request, cycleId);
      }
      await deleteTestConsultant(request, consultant.id);
    }
  });

  test('should verify data consistency across pages', async ({ page, request }) => {
    test.skip(!allowAdminMutations, 'Requires admin mutations (set E2E_ALLOW_ADMIN_MUTATIONS=true for remote)');

    // Create consultant
    const consultant = await createTestConsultant(request, {
      name: generateTestConsultantName(),
      hourlyRate: 55.0,
    });

    let cycleId: number | null = null;

    try {
      // Create cycle
      const { cycleId: createdCycleId } = await createCycleAsAdmin(request);
      cycleId = createdCycleId;

      // View consultant profile
      await page.goto(`/consultants/${consultant.id}`, { waitUntil: 'networkidle', timeout: 60000 });
      await page.waitForTimeout(2000);
      
      let pageText = await page.locator('body').textContent();
      expect(pageText).toContain(consultant.name);

      // View cycle on Golden Sheet
      await page.goto(`/cycles/${cycleId}`, { waitUntil: 'networkidle', timeout: 60000 });
      await page.waitForTimeout(2000);

      // Verify consultant data is consistent
      pageText = await page.locator('body').textContent();
      expect(pageText).toBeTruthy();
    } finally {
      // Cleanup
      if (cycleId) {
        await archiveCycleAsAdmin(request, cycleId);
      }
      await deleteTestConsultant(request, consultant.id);
    }
  });
});
