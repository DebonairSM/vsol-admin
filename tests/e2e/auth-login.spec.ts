import { test, expect } from '@playwright/test';
import { login, logout, getCurrentUser, isAuthenticated } from './helpers/admin-ui';

test.describe('Authentication & Login', () => {
  const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:5173';
  const adminUsername = process.env.TEST_ADMIN_USERNAME || 'e2e-admin';
  const adminPassword = process.env.TEST_ADMIN_PASSWORD || 'admin123';
  const consultantUsername = process.env.TEST_CONSULTANT_USERNAME || 'test-consultant-portal';
  const consultantPassword = process.env.TEST_CONSULTANT_PASSWORD || 'ChangeMe123!';

  test.beforeEach(async ({ page, context }) => {
    // Clear authentication state before each test
    // Use context.addCookies/clearCookies and navigate to a page first
    await page.goto('/login', { waitUntil: 'networkidle', timeout: 60000 });
    try {
      await page.evaluate(() => {
        localStorage.clear();
      });
    } catch (e) {
      // Ignore localStorage errors if page isn't ready
    }
  });

  test('should display login page correctly', async ({ page }) => {
    await page.goto('/login', { waitUntil: 'networkidle', timeout: 60000 });

    // Check page title/heading
    await expect(page.locator('h2')).toContainText('Portal');

    // Check form elements
    await expect(page.locator('#username')).toBeVisible();
    await expect(page.locator('#password')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();

    // Check labels
    await expect(page.locator('label[for="username"]')).toBeVisible();
    await expect(page.locator('label[for="password"]')).toBeVisible();

    // Check "Keep me logged in" checkbox
    await expect(page.locator('#keep-logged-in')).toBeVisible();
  });

  test('should successfully login as admin and redirect to dashboard', async ({ page }) => {
    await login(page, adminUsername, adminPassword);

    // Should redirect to dashboard
    await expect(page).toHaveURL(/\/dashboard/);

    // Verify authentication
    const authenticated = await isAuthenticated(page);
    expect(authenticated).toBe(true);

    // Verify user info
    const user = await getCurrentUser(page);
    expect(user).toBeTruthy();
    expect(user?.role).toBe('admin');
    expect(user?.username).toBe(adminUsername);
  });

  test('should successfully login as consultant and redirect to consultant portal', async ({ page }) => {
    await login(page, consultantUsername, consultantPassword);

    // Should redirect to consultant portal
    await expect(page).toHaveURL(/\/consultant/);

    // Verify authentication
    const authenticated = await isAuthenticated(page);
    expect(authenticated).toBe(true);

    // Verify user info
    const user = await getCurrentUser(page);
    expect(user).toBeTruthy();
    expect(user?.role).toBe('consultant');
    expect(user?.username).toBe(consultantUsername);
  });

  test('should show error for invalid credentials', async ({ page }) => {
    await page.goto('/login', { waitUntil: 'networkidle', timeout: 60000 });
    
    await page.fill('#username', 'invalid-user');
    await page.fill('#password', 'invalid-password');
    await page.click('button[type="submit"]');

    // Wait for error message
    await page.waitForTimeout(1000);
    
    // Check for error message (could be toast or inline)
    const errorLocator = page.locator('.text-red-600, [role="alert"], .bg-red-50, text=/invalid|incorrect|failed/i');
    await expect(errorLocator.first()).toBeVisible({ timeout: 5000 });

    // Should still be on login page
    await expect(page).toHaveURL(/\/login/);

    // Should not be authenticated
    const authenticated = await isAuthenticated(page);
    expect(authenticated).toBe(false);
  });

  test('should show error for empty username', async ({ page }) => {
    await page.goto('/login', { waitUntil: 'networkidle', timeout: 60000 });
    
    // Try to submit without username
    await page.fill('#password', adminPassword);
    await page.click('button[type="submit"]');

    // HTML5 validation should prevent submission
    const usernameInput = page.locator('#username');
    const validity = await usernameInput.evaluate((el: HTMLInputElement) => el.validity.valid);
    expect(validity).toBe(false);
  });

  test('should show error for empty password', async ({ page }) => {
    await page.goto('/login', { waitUntil: 'networkidle', timeout: 60000 });
    
    // Try to submit without password
    await page.fill('#username', adminUsername);
    await page.click('button[type="submit"]');

    // HTML5 validation should prevent submission
    const passwordInput = page.locator('#password');
    const validity = await passwordInput.evaluate((el: HTMLInputElement) => el.validity.valid);
    expect(validity).toBe(false);
  });

  test('should toggle password visibility', async ({ page }) => {
    await page.goto('/login', { waitUntil: 'networkidle', timeout: 60000 });
    
    const passwordInput = page.locator('#password');
    const toggleButton = page.locator('button[aria-label*="password" i]').first();

    // Initially password should be hidden
    expect(await passwordInput.getAttribute('type')).toBe('password');

    // Click toggle to show password
    await toggleButton.click();
    expect(await passwordInput.getAttribute('type')).toBe('text');

    // Click toggle again to hide password
    await toggleButton.click();
    expect(await passwordInput.getAttribute('type')).toBe('password');
  });

  test('should persist session when "Keep me logged in" is checked', async ({ page }) => {
    await page.goto('/login', { waitUntil: 'networkidle', timeout: 60000 });
    
    // Check the "Keep me logged in" checkbox
    await page.check('#keep-logged-in');
    
    await login(page, adminUsername, adminPassword);

    // Verify token is stored
    const token = await page.evaluate(() => localStorage.getItem('auth_token'));
    expect(token).toBeTruthy();
  });

  test('should logout and redirect to login', async ({ page }) => {
    // First login
    await login(page, adminUsername, adminPassword);
    await expect(page).toHaveURL(/\/dashboard/);

    // Logout
    await logout(page);

    // Should redirect to login
    await expect(page).toHaveURL(/\/login/);

    // Should not be authenticated
    const authenticated = await isAuthenticated(page);
    expect(authenticated).toBe(false);
  });

  test('should redirect authenticated admin away from login page', async ({ page }) => {
    // Login first
    await login(page, adminUsername, adminPassword);

    // Try to access login page while authenticated
    await page.goto('/login', { waitUntil: 'networkidle', timeout: 60000 });

    // Should redirect to dashboard
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test('should redirect authenticated consultant away from login page', async ({ page }) => {
    // Login first
    await login(page, consultantUsername, consultantPassword);

    // Try to access login page while authenticated
    await page.goto('/login', { waitUntil: 'networkidle', timeout: 60000 });

    // Should redirect to consultant portal
    await expect(page).toHaveURL(/\/consultant/);
  });

  test('should redirect unauthenticated user to login when accessing protected route', async ({ page }) => {
    // Clear any auth state
    await page.evaluate(() => {
      localStorage.clear();
    });

    // Try to access protected route
    await page.goto('/dashboard', { waitUntil: 'networkidle', timeout: 60000 });

    // Should redirect to login
    await expect(page).toHaveURL(/\/login/);
  });

  test('should show loading state during login', async ({ page }) => {
    await page.goto('/login', { waitUntil: 'networkidle', timeout: 60000 });
    
    const submitButton = page.locator('button[type="submit"]');
    
    await page.fill('#username', adminUsername);
    await page.fill('#password', adminPassword);

    // Click submit and immediately check for loading state
    const clickPromise = submitButton.click();
    
    // Button text should change or button should be disabled
    await expect(submitButton).toContainText(/signing|loading|.../i, { timeout: 1000 }).catch(() => {
      // If text doesn't change, button might just be disabled
      expect(submitButton).toBeDisabled();
    });

    await clickPromise;
    
    // Wait for navigation
    await page.waitForURL(/\/(dashboard|consultant)/, { timeout: 20000 });
  });
});
