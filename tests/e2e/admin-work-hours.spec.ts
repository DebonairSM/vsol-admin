import { test, expect } from '@playwright/test';

test.describe('Admin Work Hours', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/work-hours', { waitUntil: 'networkidle', timeout: 60000 });
    await page.waitForSelector('h1, table', { state: 'visible', timeout: 30000 });
  });

  test('should display work hours page correctly', async ({ page }) => {
    await expect(page).toHaveURL(/\/work-hours/);
    const heading = page.locator('h1').first();
    await expect(heading).toBeVisible({ timeout: 10000 });
  });

  test('should display work hours data', async ({ page }) => {
    await page.waitForTimeout(2000);
    const content = page.locator('table, div').first();
    await expect(content).toBeVisible({ timeout: 10000 });
  });
});
