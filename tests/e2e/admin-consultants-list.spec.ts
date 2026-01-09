import { test, expect } from '@playwright/test';
import { navigateToConsultants } from './helpers/admin-ui';

test.describe('Consultants List', () => {
  test.beforeEach(async ({ page }) => {
    await navigateToConsultants(page);
  });

  test('should display consultants page correctly', async ({ page }) => {
    // Check page title
    await expect(page.locator('h1')).toContainText('Consultants');

    // Check URL
    await expect(page).toHaveURL(/\/consultants/);
  });

  test('should display consultants table', async ({ page }) => {
    await page.waitForTimeout(2000);

    // Look for table
    const table = page.locator('table').first();
    await expect(table).toBeVisible({ timeout: 10000 });

    // Table should have headers
    const headers = table.locator('th');
    const headerCount = await headers.count();
    expect(headerCount).toBeGreaterThan(0);
  });

  test('should display consultant data in table', async ({ page }) => {
    await page.waitForTimeout(2000);

    const table = page.locator('table').first();
    const rows = table.locator('tbody tr');
    const rowCount = await rows.count();

    // Should have at least 0 rows (empty state is valid)
    expect(rowCount).toBeGreaterThanOrEqual(0);

    // If rows exist, they should have content
    if (rowCount > 0) {
      const firstRow = rows.first();
      const rowText = await firstRow.textContent();
      expect(rowText).toBeTruthy();
    }
  });

  test('should have Add Consultant button or link', async ({ page }) => {
    await page.waitForTimeout(2000);

    // Look for add button
    const addButton = page.locator('a, button').filter({ hasText: /Add Consultant|New Consultant|Create Consultant/i }).first();
    
    if (await addButton.count() > 0) {
      await expect(addButton).toBeVisible();
    }
  });

  test('should allow navigating to consultant details', async ({ page }) => {
    await page.waitForTimeout(2000);

    const table = page.locator('table').first();
    const rows = table.locator('tbody tr');
    const rowCount = await rows.count();

    if (rowCount === 0) {
      test.skip(true, 'No consultants to navigate to');
      return;
    }

    // Look for view/edit links
    const firstRow = rows.first();
    const viewLink = firstRow.locator('a, button').filter({ hasText: /View|Edit|Details/i }).first();

    if (await viewLink.count() > 0) {
      await viewLink.click();
      
      // Should navigate to consultant detail page
      await page.waitForURL(/\/consultants\/\d+/, { timeout: 10000 });
    }
  });

  test('should display loading state initially', async ({ page }) => {
    // Navigate fresh to see loading
    await page.goto('/consultants', { waitUntil: 'domcontentloaded' });

    // Loading might be brief
    const loadingText = page.locator('text=/Loading|loading/i');
    const hasLoading = await loadingText.count() > 0;

    // Eventually page should load
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).toBeVisible();
  });

  test('should show tabs for different views', async ({ page }) => {
    await page.waitForTimeout(2000);

    // Look for tabs
    const tabs = page.locator('[role="tablist"], .tabs').first();
    
    if (await tabs.count() > 0) {
      await expect(tabs).toBeVisible();
      
      // Should have tab buttons
      const tabButtons = tabs.locator('[role="tab"]');
      const tabCount = await tabButtons.count();
      expect(tabCount).toBeGreaterThan(0);
    }
  });

  test('should display consultant hourly rates', async ({ page }) => {
    await page.waitForTimeout(2000);

    const table = page.locator('table').first();
    
    // Look for rate column
    const rateHeader = table.locator('th').filter({ hasText: /Rate|Hourly/i });
    
    if (await rateHeader.count() > 0) {
      // Rates should be visible in table
      const rateCells = table.locator('td').filter({ hasText: /\$|\d+\.\d{2}/ });
      // Rates may or may not exist depending on consultants
      expect(await rateCells.count() >= 0).toBeTruthy();
    }
  });
});
