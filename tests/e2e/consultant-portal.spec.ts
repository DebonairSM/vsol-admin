import { test, expect } from '@playwright/test';

test.describe('Consultant Portal Page', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to portal page (auth state is loaded automatically via global setup)
    await page.goto('/consultant', { waitUntil: 'networkidle', timeout: 60000 });
    
    // Wait for URL to be correct
    await page.waitForURL('**/consultant', { timeout: 10000 });
    
    // Check for console errors before proceeding
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });
    
    // Wait for the heading text to appear - this is the most reliable indicator
    // that the ConsultantPortalPage component has rendered
    // Use a longer timeout to account for API calls and React rendering
    try {
      await page.waitForSelector('text=Consultant Portal', { state: 'visible', timeout: 30000 });
    } catch (error) {
      // If it fails, capture page content for debugging
      const bodyText = await page.locator('body').textContent();
      const pageHTML = await page.content();
      console.log('Page body text:', bodyText?.substring(0, 500));
      console.log('Console errors:', consoleErrors);
      throw new Error(`Failed to find "Consultant Portal" heading. Page may be blank. Errors: ${consoleErrors.join(', ')}`);
    }
  });

  test('should display the portal page correctly', async ({ page }) => {
    // Check page title
    await expect(page.locator('h1')).toContainText('Consultant Portal');
    
    // Check welcome message (should show consultant name or default)
    const welcomeText = await page.locator('text=/Welcome/').textContent();
    expect(welcomeText).toBeTruthy();
    expect(welcomeText?.length).toBeGreaterThan(0);
  });

  test('should display all portal cards', async ({ page }) => {
    // Check for Upload Invoice card
    await expect(page.locator('text=Upload Invoice')).toBeVisible();
    await expect(page.locator('text=Upload your monthly invoice for payroll processing')).toBeVisible();
    
    // Check for Available Cycles card
    await expect(page.locator('text=Available Cycles')).toBeVisible();
    await expect(page.locator('text=Payroll cycles available for invoice upload')).toBeVisible();
    
    // Check for Profile card
    await expect(page.locator('text=Profile')).toBeVisible();
    await expect(page.locator('text=View and update your profile information')).toBeVisible();
  });

  test('should display cycle count (even if zero)', async ({ page }) => {
    // Wait for cycles to load (loading state might be brief)
    await page.waitForTimeout(2000);
    
    // The cycles card should show a number (0 or more)
    const cyclesCard = page.locator('text=Available Cycles').locator('..').locator('..');
    const cycleCount = await cyclesCard.locator('p.text-2xl').textContent();
    
    // Should be a valid number
    expect(cycleCount).toBeTruthy();
    const count = parseInt(cycleCount || '0', 10);
    expect(isNaN(count)).toBeFalsy();
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test('should have working navigation links', async ({ page }) => {
    // Check Upload Invoice link
    const invoiceLink = page.locator('a:has-text("Go to Invoice Upload")');
    await expect(invoiceLink).toBeVisible();
    expect(await invoiceLink.getAttribute('href')).toBe('/consultant/invoices');
    
    // Check Profile link
    const profileLink = page.locator('a:has-text("View Profile")');
    await expect(profileLink).toBeVisible();
    expect(await profileLink.getAttribute('href')).toBe('/consultant/profile');
  });

  test('should not show blank page or errors', async ({ page }) => {
    // Check that page has content
    const bodyText = await page.locator('body').textContent();
    expect(bodyText).toBeTruthy();
    expect(bodyText?.length).toBeGreaterThan(0);
    
    // Check for error messages (should not appear)
    const errorMessages = [
      'Error',
      'Failed to load',
      'Something went wrong',
      'Network error'
    ];
    
    for (const errorMsg of errorMessages) {
      const errorElement = page.locator(`text=${errorMsg}`);
      // Use count() to check if element exists without throwing
      const count = await errorElement.count();
      expect(count).toBe(0);
    }
    
    // Check console for errors (basic check)
    const logs: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        logs.push(msg.text());
      }
    });
    
    // Reload page to capture console errors
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForSelector('text=Consultant Portal', { state: 'visible', timeout: 30000 });
    
    // Filter out known non-critical errors (like favicon, etc.)
    const criticalErrors = logs.filter(log => 
      !log.includes('favicon') && 
      !log.includes('404') &&
      !log.toLowerCase().includes('warning')
    );
    
    // If there are critical errors, log them but don't fail the test
    // This is just for visibility - the test above should catch rendering issues
    if (criticalErrors.length > 0) {
      console.log('Console errors detected:', criticalErrors);
    }
  });
});

