import { test, expect } from '@playwright/test';

test.describe('Admin Invoices', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/client-invoices', { waitUntil: 'networkidle', timeout: 60000 });
    await page.waitForSelector('h1, table', { state: 'visible', timeout: 30000 });
  });

  test('should display invoices page correctly', async ({ page }) => {
    await expect(page).toHaveURL(/\/client-invoices/);
    const heading = page.locator('h1').first();
    await expect(heading).toBeVisible({ timeout: 10000 });
  });

  test('should display invoices list', async ({ page }) => {
    await page.waitForTimeout(2000);
    const table = page.locator('table, div').filter({ hasText: /Invoice|invoice/i }).first();
    await expect(table).toBeVisible({ timeout: 10000 });
  });
});
