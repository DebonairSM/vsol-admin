import { chromium, FullConfig } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';

async function globalSetup(config: FullConfig) {
  const username = process.env.TEST_CONSULTANT_USERNAME || 'test-consultant';
  const password = process.env.TEST_CONSULTANT_PASSWORD || 'ChangeMe123!';
  const baseURL = config.projects[0].use.baseURL || 'http://localhost:5173';

  const browser = await chromium.launch();
  const page = await browser.newPage();

  try {
    // Navigate to login page
    console.log(`Navigating to ${baseURL}/login...`);
    await page.goto(`${baseURL}/login`);
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('#username', { state: 'visible', timeout: 10000 });

    // Login
    console.log(`Logging in as ${username}...`);
    await page.fill('#username', username);
    await page.fill('#password', password);
    await page.waitForTimeout(500);
    
    // Click submit and wait for navigation
    const clickPromise = page.click('button[type="submit"]');
    const navigationPromise = page.waitForURL(/\/(dashboard|consultant)/, { timeout: 20000 });
    
    await clickPromise;
    
    try {
      await navigationPromise;
      const finalUrl = page.url();
      console.log(`✅ Login successful, redirected to: ${finalUrl}`);
    } catch (navError) {
      // Check for error messages on the page
      const errorElement = await page.locator('.text-red-600, [role="alert"], .bg-red-50').first();
      if (await errorElement.isVisible()) {
        const errorText = await errorElement.textContent();
        console.error(`❌ Login error: ${errorText}`);
        throw new Error(`Login failed: ${errorText}`);
      }
      
      // Take screenshot for debugging
      const screenshotPath = path.join(__dirname, '../.auth/login-error.png');
      await page.screenshot({ path: screenshotPath, fullPage: true });
      console.error(`❌ Login timeout. Screenshot saved to: ${screenshotPath}`);
      console.error(`Current URL: ${page.url()}`);
      throw navError;
    }

    // Save authentication state
    const storageStatePath = path.join(__dirname, '../.auth/consultant-auth.json');
    const dir = path.dirname(storageStatePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    await page.context().storageState({ path: storageStatePath });
    
    console.log('✅ Authentication state saved successfully');
  } catch (error) {
    console.error('❌ Failed to authenticate:', error);
    throw error;
  } finally {
    await browser.close();
  }
}

export default globalSetup;

