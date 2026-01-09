import type { Page } from '@playwright/test';

/**
 * Helper functions for common admin UI operations
 */

/**
 * Navigate to dashboard and wait for it to load
 */
export async function navigateToDashboard(page: Page) {
  await page.goto('/dashboard', { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForSelector('h1', { state: 'visible', timeout: 30000 });
  // Dashboard title might vary, but wait for some content
  const bodyText = await page.locator('body').textContent();
  if (!bodyText || bodyText.length === 0) {
    throw new Error('Dashboard page appears to be empty');
  }
}

/**
 * Navigate to cycles page and wait for it to load
 */
export async function navigateToCycles(page: Page) {
  await page.goto('/cycles/new', { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForSelector('form, h1', { state: 'visible', timeout: 30000 });
}

/**
 * Navigate to consultants page and wait for it to load
 */
export async function navigateToConsultants(page: Page) {
  await page.goto('/consultants', { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForSelector('h1', { state: 'visible', timeout: 30000 });
}

/**
 * Navigate to Golden Sheet page for a specific cycle
 */
export async function navigateToGoldenSheet(page: Page, cycleId: number) {
  await page.goto(`/cycles/${cycleId}`, { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForSelector('h1, table', { state: 'visible', timeout: 30000 });
}

/**
 * Wait for toast notification to appear
 */
export async function waitForToast(page: Page, text: string | RegExp, timeout = 5000) {
  const toast = typeof text === 'string' 
    ? page.locator(`text=${text}`)
    : page.locator(`text=/${text.source}/`);
  await toast.first().waitFor({ state: 'visible', timeout });
  return toast;
}

/**
 * Click logout button and wait for redirect to login
 */
export async function logout(page: Page) {
  // Look for logout button (might be in sidebar or header)
  const logoutButton = page.locator('button:has-text("Logout"), button:has-text("Log out"), a:has-text("Logout")').first();
  if (await logoutButton.count() > 0) {
    await logoutButton.click();
    await page.waitForURL(/\/login/, { timeout: 10000 });
  } else {
    // Try via API or localStorage if button not found
    try {
      await page.evaluate(() => {
        try {
          localStorage.removeItem('auth_token');
        } catch {
          // Ignore localStorage errors
        }
        window.location.href = '/login';
      });
      await page.waitForURL(/\/login/, { timeout: 10000 });
    } catch {
      // Fallback: just navigate to login
      await page.goto('/login');
    }
  }
}

/**
 * Fill and submit login form
 */
export async function login(page: Page, username: string, password: string) {
  await page.goto('/login', { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForSelector('#username', { state: 'visible', timeout: 10000 });
  
  await page.fill('#username', username);
  await page.fill('#password', password);
  await page.click('button[type="submit"]');
  
  // Wait for navigation after login
  await page.waitForURL(/\/(dashboard|consultant)/, { timeout: 20000 });
}

/**
 * Check if user is authenticated (has auth_token in localStorage)
 */
export async function isAuthenticated(page: Page): Promise<boolean> {
  try {
    const token = await page.evaluate(() => {
      try {
        return localStorage.getItem('auth_token');
      } catch {
        return null;
      }
    });
    return !!token;
  } catch {
    return false;
  }
}

/**
 * Get current user info from localStorage or API
 */
export async function getCurrentUser(page: Page) {
  let token: string | null = null;
  try {
    token = await page.evaluate(() => {
      try {
        return localStorage.getItem('auth_token');
      } catch {
        return null;
      }
    });
  } catch {
    return null;
  }
  
  if (!token) return null;
  
  const baseURL = page.url().split('/').slice(0, 3).join('/');
  try {
    const response = await page.request.get(`${baseURL}/api/auth/me`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    if (response.ok()) {
      return await response.json();
    }
  } catch {
    // Ignore errors
  }
  return null;
}
