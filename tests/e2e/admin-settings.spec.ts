import { test, expect } from '@playwright/test';

test.describe('Admin Settings', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/settings', { waitUntil: 'networkidle', timeout: 60000 });
    await page.waitForSelector('h1, form', { state: 'visible', timeout: 30000 });
  });

  test('should display settings page correctly', async ({ page }) => {
    await expect(page).toHaveURL(/\/settings/);
    const heading = page.locator('h1').first();
    await expect(heading).toBeVisible({ timeout: 10000 });
  });

  test('should display settings form', async ({ page }) => {
    await page.waitForTimeout(2000);
    const form = page.locator('form').first();
    await expect(form).toBeVisible({ timeout: 10000 });
  });
});
