import { chromium, FullConfig } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';
import { execSync } from 'child_process';

function ensureDefaultTestConsultantUser(username: string, password: string) {
  // Only auto-seed when using the default test credentials.
  // If a developer overrides env vars, we assume they manage the account themselves.
  if (username !== 'test-consultant-portal' || password !== 'ChangeMe123!') return;

  // Allow opting out (useful when pointing tests at a remote environment).
  if (process.env.PLAYWRIGHT_SKIP_TEST_USER_SEED === 'true') return;

  console.log('Seeding test consultant portal user (if missing)...');
  // `tsx` is a package binary, not a pnpm script, so we must use `pnpm exec`.
  execSync('pnpm --filter @vsol-admin/api exec tsx scripts/create-test-consultant-portal.ts', {
    stdio: 'inherit'
  });
}

function ensureDefaultE2EAdminUser() {
  if (process.env.PLAYWRIGHT_SKIP_TEST_USER_SEED === 'true') return;

  // Always ensure an admin exists unless explicitly skipped; tests use this for setup.
  console.log('Seeding E2E admin user (if missing)...');
  execSync('pnpm --filter @vsol-admin/api exec tsx scripts/ensure-e2e-admin.ts', {
    stdio: 'inherit'
  });
}

async function globalSetup(config: FullConfig) {
  const username = process.env.TEST_CONSULTANT_USERNAME || 'test-consultant-portal';
  const password = process.env.TEST_CONSULTANT_PASSWORD || 'ChangeMe123!';
  const baseURL = config.projects[0].use.baseURL || 'http://localhost:5173';

  ensureDefaultE2EAdminUser();
  ensureDefaultTestConsultantUser(username, password);

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

