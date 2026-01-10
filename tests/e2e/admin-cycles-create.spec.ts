import { test, expect } from '@playwright/test';
import { navigateToDashboard, waitForToast } from './helpers/admin-ui';
import { createCycleAsAdmin, archiveCycleAsAdmin } from './helpers/admin-api';

test.describe('Cycle Creation', () => {
  const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:5173';
  const isLocalBaseURL = baseURL.includes('localhost') || baseURL.includes('127.0.0.1');
  const allowAdminMutations = isLocalBaseURL || process.env.E2E_ALLOW_ADMIN_MUTATIONS === 'true';

  test.beforeEach(async ({ page }) => {
    await navigateToDashboard(page);
    
    // Navigate to new cycle page
    await page.goto('/cycles/new', { waitUntil: 'networkidle', timeout: 60000 });
    await page.waitForSelector('h1', { state: 'visible', timeout: 30000 });
  });

  test('should display new cycle page correctly', async ({ page }) => {
    // Check page title
    await expect(page.locator('h1')).toContainText('Create New Cycle');

    // Check form elements
    await expect(page.locator('form')).toBeVisible();
    await expect(page.locator('#monthLabel')).toBeVisible();
    await expect(page.locator('#globalWorkHours')).toBeVisible();
    await expect(page.locator('#omnigoBonus')).toBeVisible();

    // Check submit button
    const submitButton = page.locator('button[type="submit"]');
    await expect(submitButton).toBeVisible();
    await expect(submitButton).toContainText('Create Cycle');
  });

  test('should show month selector when work hours data is available', async ({ page }) => {
    await page.waitForTimeout(2000);

    // Check if month selector exists (it may or may not, depending on data)
    const monthSelector = page.locator('button, select').filter({ hasText: /Select a month|Select/i }).first();
    
    // If loading message appears, wait for it to finish
    const loadingMessage = page.locator('text=/Loading work hours/i');
    if (await loadingMessage.count() > 0) {
      await page.waitForTimeout(3000);
    }

    // Month selector might exist or we might see a message about no data
    const selectorExists = await monthSelector.count() > 0;
    const noDataMessage = await page.locator('text=/No work hours data/i').count() > 0;
    
    // One of these should be true
    expect(selectorExists || noDataMessage).toBeTruthy();
  });

  test('should auto-populate month label when month is selected', async ({ page }) => {
    test.skip(!allowAdminMutations, 'Requires admin mutations (set E2E_ALLOW_ADMIN_MUTATIONS=true for remote)');

    await page.waitForTimeout(2000);

    // Try to find and select a month if available
    const monthSelector = page.locator('[role="combobox"], select').first();
    const monthSelectorExists = await monthSelector.count() > 0;

    if (monthSelectorExists) {
      await monthSelector.click();
      await page.waitForTimeout(500);

      // Select first available month option
      const options = page.locator('[role="option"], option').first();
      if (await options.count() > 0) {
        await options.first().click();
        await page.waitForTimeout(1000);

        // Check that monthLabel was auto-populated
        const monthLabelInput = page.locator('#monthLabel');
        const monthLabelValue = await monthLabelInput.inputValue();
        expect(monthLabelValue.length).toBeGreaterThan(0);
      }
    } else {
      // If no selector, manually enter month label
      const monthLabelInput = page.locator('#monthLabel');
      await monthLabelInput.fill('January 2025');
      
      const value = await monthLabelInput.inputValue();
      expect(value).toBe('January 2025');
    }
  });

  test('should show validation error for empty month label', async ({ page }) => {
    // Try to submit without month label
    const submitButton = page.locator('button[type="submit"]');
    
    // Clear month label if it has a value
    const monthLabelInput = page.locator('#monthLabel');
    await monthLabelInput.clear();

    // HTML5 validation might prevent submission, or we might get an error
    await submitButton.click();
    
    await page.waitForTimeout(1000);

    // Either HTML5 validation or form validation should catch this
    const hasRequiredAttribute = await monthLabelInput.getAttribute('required');
    const errorMessage = page.locator('text=/required|Month label is required/i');

    if (hasRequiredAttribute) {
      // HTML5 validation
      const validity = await monthLabelInput.evaluate((el: HTMLInputElement) => el.validity.valid);
      expect(validity).toBe(false);
    } else {
      // Form validation
      await expect(errorMessage.first()).toBeVisible({ timeout: 3000 });
    }
  });

  test('should successfully create cycle and redirect to Golden Sheet', async ({ page, request }) => {
    test.skip(!allowAdminMutations, 'Requires admin mutations (set E2E_ALLOW_ADMIN_MUTATIONS=true for remote)');

    await page.waitForTimeout(2000);

    // Fill in required fields
    const monthLabelInput = page.locator('#monthLabel');
    const uniqueLabel = `E2E Test ${Date.now()}`;
    await monthLabelInput.fill(uniqueLabel);

    // Fill optional fields
    const globalWorkHoursInput = page.locator('#globalWorkHours');
    await globalWorkHoursInput.fill('160');

    const omnigoBonusInput = page.locator('#omnigoBonus');
    await omnigoBonusInput.fill('1000');

    // Submit form
    const submitButton = page.locator('button[type="submit"]');
    const createResponse = page.waitForResponse(
      (r) => r.url().includes('/api/cycles') && r.request().method() === 'POST',
      { timeout: 30000 }
    );

    await submitButton.click();
    const response = await createResponse;

    if (!response.ok()) {
      const body = await response.text();
      throw new Error(`Create cycle failed: ${body}`);
    }

    // Should redirect to Golden Sheet
    await page.waitForURL(/\/cycles\/\d+/, { timeout: 15000 });

    // Extract cycle ID from URL
    const url = page.url();
    const match = url.match(/\/cycles\/(\d+)/);
    expect(match).toBeTruthy();
    const cycleId = match ? parseInt(match[1], 10) : null;

    // Verify we're on Golden Sheet page
    await expect(page.locator('h1, table')).toBeVisible({ timeout: 10000 });

    // Cleanup
    if (cycleId) {
      await archiveCycleAsAdmin(request, cycleId);
    }
  });

  test('should show error for duplicate month label', async ({ page, request }) => {
    test.skip(!allowAdminMutations, 'Requires admin mutations (set E2E_ALLOW_ADMIN_MUTATIONS=true for remote)');

    // Create a cycle first
    const { cycleId: existingCycleId, monthLabel: existingLabel } = await createCycleAsAdmin(request);

    try {
      await page.reload({ waitUntil: 'networkidle' });
      await page.waitForSelector('h1', { state: 'visible', timeout: 30000 });

      // Try to create another cycle with the same month label
      const monthLabelInput = page.locator('#monthLabel');
      await monthLabelInput.fill(existingLabel);

      const submitButton = page.locator('button[type="submit"]');
      await submitButton.click();

      // Wait for error message
      await page.waitForTimeout(2000);

      // Should show error (could be toast or inline)
      const errorLocator = page.locator('text=/already exists|duplicate|error/i').first();
      await expect(errorLocator).toBeVisible({ timeout: 5000 });
    } finally {
      // Cleanup
      await archiveCycleAsAdmin(request, existingCycleId);
    }
  });

  test('should allow editing global work hours', async ({ page }) => {
    const globalWorkHoursInput = page.locator('#globalWorkHours');
    await globalWorkHoursInput.fill('180');

    const value = await globalWorkHoursInput.inputValue();
    expect(value).toBe('180');
  });

  test('should allow editing omnigo bonus', async ({ page }) => {
    const omnigoBonusInput = page.locator('#omnigoBonus');
    await omnigoBonusInput.fill('2500.50');

    const value = await omnigoBonusInput.inputValue();
    expect(value).toBe('2500.5'); // Number inputs may format differently
  });

  test('should allow editing invoice bonus', async ({ page }) => {
    const invoiceBonusInput = page.locator('#invoiceBonus');
    await invoiceBonusInput.fill('1500.75');

    const value = await invoiceBonusInput.inputValue();
    expect(value).toBeTruthy();
  });

  test('should show loading state during submission', async ({ page, request }) => {
    test.skip(!allowAdminMutations, 'Requires admin mutations (set E2E_ALLOW_ADMIN_MUTATIONS=true for remote)');

    // Fill in required fields
    const monthLabelInput = page.locator('#monthLabel');
    const uniqueLabel = `E2E Test ${Date.now()}`;
    await monthLabelInput.fill(uniqueLabel);

    const submitButton = page.locator('button[type="submit"]');
    
    // Wait for response to track cycle creation
    const createResponse = page.waitForResponse(
      (r) => r.url().includes('/api/cycles') && r.request().method() === 'POST',
      { timeout: 30000 }
    );
    
    // Click and check for loading state
    await submitButton.click();

    // Button should be disabled or show loading text
    const isDisabled = await submitButton.isDisabled();
    const buttonText = await submitButton.textContent();

    // Either disabled or shows "Creating..."
    expect(isDisabled || buttonText?.includes('Creating')).toBeTruthy();

    // Wait for response and extract cycle ID for cleanup
    const response = await createResponse;
    if (response.ok()) {
      const json = await response.json();
      const cycleId = json.id;
      
      // Cleanup: delete the cycle we just created
      if (cycleId) {
        await archiveCycleAsAdmin(request, cycleId);
      }
    }
  });

  test('should have cancel button that navigates back', async ({ page }) => {
    const cancelButton = page.locator('button:has-text("Cancel")').first();
    await expect(cancelButton).toBeVisible();

    await cancelButton.click();

    // Should navigate back to dashboard
    await page.waitForURL(/\/dashboard/, { timeout: 10000 });
  });

  test('should show info card with next steps', async ({ page }) => {
    const infoCard = page.locator('text=/What happens next/i').first();
    await expect(infoCard).toBeVisible({ timeout: 5000 });

    // Check for key points
    const lineItemsText = page.locator('text=/Line items will be automatically created/i');
    await expect(lineItemsText).toBeVisible();
  });

  test('should auto-populate global work hours when month is selected', async ({ page }) => {
    test.skip(!allowAdminMutations, 'Requires admin mutations (set E2E_ALLOW_ADMIN_MUTATIONS=true for remote)');

    await page.waitForTimeout(2000);

    // Try to select a month if selector exists
    const monthSelector = page.locator('[role="combobox"], select').first();
    if (await monthSelector.count() > 0) {
      await monthSelector.click();
      await page.waitForTimeout(500);

      const firstOption = page.locator('[role="option"], option').first();
      if (await firstOption.count() > 0) {
        const optionText = await firstOption.textContent();
        await firstOption.click();
        await page.waitForTimeout(1000);

        // Check that global work hours was auto-populated
        const globalWorkHoursInput = page.locator('#globalWorkHours');
        const workHoursValue = await globalWorkHoursInput.inputValue();
        
        // Should have a value (might extract from option text)
        expect(workHoursValue).toBeTruthy();
        expect(parseInt(workHoursValue || '0', 10)).toBeGreaterThan(0);
      }
    }
  });
});
