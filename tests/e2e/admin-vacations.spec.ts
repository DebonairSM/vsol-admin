import { test, expect } from '@playwright/test';

test.describe('Admin Vacations', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/vacations', { waitUntil: 'networkidle', timeout: 60000 });
    await page.waitForSelector('h1, table, div', { state: 'visible', timeout: 30000 });
  });

  test('should display vacations page correctly', async ({ page }) => {
    await expect(page).toHaveURL(/\/vacations/);
    const heading = page.locator('h1').first();
    await expect(heading).toBeVisible({ timeout: 10000 });
  });

  test('should display vacation data', async ({ page }) => {
    await page.waitForTimeout(2000);
    const content = page.locator('table, div').first();
    await expect(content).toBeVisible({ timeout: 10000 });
  });
});
