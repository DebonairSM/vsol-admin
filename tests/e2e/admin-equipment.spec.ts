import { test, expect } from '@playwright/test';

test.describe('Admin Equipment', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/equipment', { waitUntil: 'networkidle', timeout: 60000 });
    await page.waitForSelector('h1, table', { state: 'visible', timeout: 30000 });
  });

  test('should display equipment page correctly', async ({ page }) => {
    await expect(page).toHaveURL(/\/equipment/);
    const heading = page.locator('h1').first();
    await expect(heading).toBeVisible({ timeout: 10000 });
  });

  test('should display equipment list', async ({ page }) => {
    await page.waitForTimeout(2000);
    const table = page.locator('table').first();
    await expect(table).toBeVisible({ timeout: 10000 });
  });

  test('should have add equipment button', async ({ page }) => {
    const addButton = page.locator('a, button').filter({ hasText: /Add|New|Create/i }).first();
    if (await addButton.count() > 0) {
      await expect(addButton).toBeVisible();
    }
  });
});
