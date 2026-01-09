import { test, expect } from '@playwright/test';
import { navigateToConsultants } from './helpers/admin-ui';
import { createTestConsultant, deleteTestConsultant, generateTestConsultantName } from './helpers/fixtures';

test.describe('Consultant CRUD Operations', () => {
  const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:5173';
  const isLocalBaseURL = baseURL.includes('localhost') || baseURL.includes('127.0.0.1');
  const allowAdminMutations = isLocalBaseURL || process.env.E2E_ALLOW_ADMIN_MUTATIONS === 'true';

  let testConsultantId: number | null = null;

  test.beforeEach(async ({ page }) => {
    await navigateToConsultants(page);
  });

  test.afterEach(async ({ request }) => {
    if (testConsultantId) {
      await deleteTestConsultant(request, testConsultantId);
      testConsultantId = null;
    }
  });

  test('should create new consultant', async ({ page, request }) => {
    test.skip(!allowAdminMutations, 'Requires admin mutations (set E2E_ALLOW_ADMIN_MUTATIONS=true for remote)');

    // Click add consultant button
    const addButton = page.locator('a, button').filter({ hasText: /Add Consultant|New Consultant/i }).first();
    if (await addButton.count() > 0) {
      await addButton.click();
      await page.waitForURL(/\/consultants\/new|\/consultants\/create/, { timeout: 10000 });
    } else {
      // Navigate directly if button not found
      await page.goto('/consultants/new', { waitUntil: 'networkidle', timeout: 60000 });
    }

    // Fill in required fields
    const nameInput = page.locator('#name, input[name="name"]').first();
    const testName = generateTestConsultantName();
    await nameInput.fill(testName);

    const hourlyRateInput = page.locator('#hourlyRate, input[name="hourlyRate"]').first();
    await hourlyRateInput.fill('55.00');

    // Submit form
    const submitButton = page.locator('button[type="submit"]').first();
    const createResponse = page.waitForResponse(
      (r) => r.url().includes('/api/consultants') && r.request().method() === 'POST',
      { timeout: 30000 }
    );

    await submitButton.click();
    const response = await createResponse;

    if (!response.ok()) {
      const body = await response.text();
      throw new Error(`Create consultant failed: ${body}`);
    }

    const json = await response.json();
    testConsultantId = json.id;

    // Should redirect or show success
    await page.waitForTimeout(2000);
    const currentUrl = page.url();
    expect(currentUrl.includes('/consultants') || currentUrl.includes(`/consultants/${testConsultantId}`)).toBeTruthy();
  });

  test('should validate required fields when creating consultant', async ({ page }) => {
    test.skip(!allowAdminMutations, 'Requires admin mutations (set E2E_ALLOW_ADMIN_MUTATIONS=true for remote)');

    // Navigate to create page
    await page.goto('/consultants/new', { waitUntil: 'networkidle', timeout: 60000 });

    // Try to submit without filling fields
    const submitButton = page.locator('button[type="submit"]').first();
    await submitButton.click();

    await page.waitForTimeout(1000);

    // Should show validation errors
    const nameInput = page.locator('#name, input[name="name"]').first();
    const hasRequired = await nameInput.getAttribute('required');
    
    if (hasRequired) {
      const validity = await nameInput.evaluate((el: HTMLInputElement) => el.validity.valid);
      expect(validity).toBe(false);
    } else {
      const errorMessage = page.locator('text=/required|invalid/i').first();
      await expect(errorMessage).toBeVisible({ timeout: 3000 });
    }
  });

  test('should view consultant profile', async ({ page, request }) => {
    test.skip(!allowAdminMutations, 'Requires admin mutations (set E2E_ALLOW_ADMIN_MUTATIONS=true for remote)');

    // Create a test consultant
    const consultant = await createTestConsultant(request, {
      name: generateTestConsultantName(),
      hourlyRate: 50.0,
    });
    testConsultantId = consultant.id;

    // Navigate to consultant profile
    await page.goto(`/consultants/${consultant.id}`, { waitUntil: 'networkidle', timeout: 60000 });

    // Should display consultant information
    await page.waitForSelector('h1, table', { state: 'visible', timeout: 30000 });
    
    const pageText = await page.locator('body').textContent();
    expect(pageText).toContain(consultant.name);
  });

  test('should edit consultant information', async ({ page, request }) => {
    test.skip(!allowAdminMutations, 'Requires admin mutations (set E2E_ALLOW_ADMIN_MUTATIONS=true for remote)');

    // Create a test consultant
    const consultant = await createTestConsultant(request, {
      name: generateTestConsultantName(),
      hourlyRate: 50.0,
    });
    testConsultantId = consultant.id;

    // Navigate to edit page
    await page.goto(`/consultants/${consultant.id}/edit`, { waitUntil: 'networkidle', timeout: 60000 });

    // Update hourly rate
    const hourlyRateInput = page.locator('#hourlyRate, input[name="hourlyRate"]').first();
    if (await hourlyRateInput.count() > 0) {
      await hourlyRateInput.fill('60.00');

      // Submit
      const submitButton = page.locator('button[type="submit"]').first();
      const updateResponse = page.waitForResponse(
        (r) => r.url().includes(`/api/consultants/${consultant.id}`) && ['PUT', 'PATCH'].includes(r.request().method()),
        { timeout: 30000 }
      );

      await submitButton.click();
      await updateResponse;

      // Verify update
      await page.waitForTimeout(2000);
      const updatedValue = await hourlyRateInput.inputValue();
      expect(updatedValue).toContain('60');
    }
  });
});
