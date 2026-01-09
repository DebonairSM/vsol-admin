import { test, expect } from '@playwright/test';

test.describe('Admin Audit Log', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/audit', { waitUntil: 'networkidle', timeout: 60000 });
    await page.waitForSelector('h1, table', { state: 'visible', timeout: 30000 });
  });

  test('should display audit log page correctly', async ({ page }) => {
    await expect(page).toHaveURL(/\/audit/);
    const heading = page.locator('h1').first();
    await expect(heading).toBeVisible({ timeout: 10000 });
  });

  test('should display audit log entries', async ({ page }) => {
    await page.waitForTimeout(2000);
    const table = page.locator('table').first();
    await expect(table).toBeVisible({ timeout: 10000 });
  });
});
