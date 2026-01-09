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

async function authenticateConsultant(config: FullConfig) {
  const username = process.env.TEST_CONSULTANT_USERNAME || 'test-consultant-portal';
  const password = process.env.TEST_CONSULTANT_PASSWORD || 'ChangeMe123!';
  const baseURL = config.projects[0].use.baseURL || 'http://localhost:5173';
  const storageStatePath = path.join(__dirname, '../.auth/consultant-auth.json');

  console.log(`\n📋 Consultant Portal E2E Setup`);
  console.log(`   Username: ${username}`);
  console.log(`   Base URL: ${baseURL}`);
  console.log(`   Note: User must have 'consultant' role to access /consultant routes\n`);

  // Check if auth state exists and is valid
  if (fs.existsSync(storageStatePath)) {
    try {
      const browser = await chromium.launch();
      const context = await browser.newContext({
        storageState: storageStatePath
      });
      const page = await context.newPage();
      
      // Test if auth state is still valid
      await page.goto(`${baseURL}/dashboard`, { waitUntil: 'networkidle', timeout: 10000 });
      const currentUrl = page.url();
      
      // If we're not redirected to login, auth is valid
      if (!currentUrl.includes('/login')) {
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
          token = null;
        }
        
        if (token) {
          // Verify token with API
          try {
            const meResp = await page.request.get(`${baseURL}/api/auth/me`, {
              headers: { Authorization: `Bearer ${token}` }
            });
            if (meResp.ok()) {
              const user = await meResp.json() as { role?: string };
              if (user.role === 'consultant') {
                console.log('✅ Using existing consultant auth state');
                await browser.close();
                return;
              }
            }
          } catch {
            // Token invalid, will re-authenticate
          }
        }
      }
      
      await browser.close();
      // Auth state invalid, delete it and re-authenticate
      fs.unlinkSync(storageStatePath);
      console.log('⚠️  Existing consultant auth state invalid, re-authenticating...');
    } catch (error) {
      // If validation fails, delete and re-authenticate
      if (fs.existsSync(storageStatePath)) {
        fs.unlinkSync(storageStatePath);
      }
      console.log('⚠️  Failed to validate consultant auth state, re-authenticating...');
    }
  }

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
    
    // Click submit and wait for navigation or error
    const clickPromise = page.click('button[type="submit"]');
    
    // Wait a bit for either navigation or error message
    await page.waitForTimeout(2000);
    
    // Check if we got a rate limit error before waiting for navigation
    const errorElement = await page.locator('.text-red-600, [role="alert"], .bg-red-50').first();
    if (await errorElement.isVisible()) {
      const errorText = await errorElement.textContent();
      if (errorText?.includes('Too many') || errorText?.includes('rate limit')) {
        console.error(`⚠️  Rate limit detected: ${errorText}`);
        console.error('   Skipping consultant authentication. If auth state files exist, tests may still work.');
        console.error('   To fix: Wait 15 minutes for rate limit to reset, or use existing auth state files.');
        // Don't throw - allow tests to continue if auth state exists
        if (fs.existsSync(storageStatePath)) {
          console.log('   Using existing consultant auth state file (may be stale)...');
          await browser.close();
          return;
        }
        throw new Error(`Rate limit exceeded. Please wait 15 minutes or use existing auth state. Error: ${errorText}`);
      }
    }
    
    const navigationPromise = page.waitForURL(/\/(dashboard|consultant)/, { timeout: 18000 });
    await clickPromise;
    
    try {
      await navigationPromise;
      const finalUrl = page.url();
      console.log(`✅ Login successful, redirected to: ${finalUrl}`);
      
      // Verify the user is a consultant (not admin)
      // If redirected to /dashboard, the user is likely an admin
      if (finalUrl.includes('/dashboard')) {
        // Check user role via API
        const authToken = await page.evaluate(() => {
          try {
            return localStorage.getItem('auth_token');
          } catch {
            return null;
          }
        });
        let userRole: string | undefined;
        let userName: string | undefined;
        
        if (authToken) {
          try {
            const meResp = await page.request.get(`${baseURL}/api/auth/me`, {
              headers: { Authorization: `Bearer ${authToken}` }
            });
            if (meResp.ok()) {
              const user = await meResp.json() as { username?: string; role?: string };
              userRole = user.role;
              userName = user.username;
            }
          } catch (apiError) {
            // API check failed, but we'll still throw error about redirect
          }
        }
        
        // Delete any existing storage state file to prevent using wrong credentials
        if (fs.existsSync(storageStatePath)) {
          fs.unlinkSync(storageStatePath);
          console.log('⚠️  Deleted invalid storage state file');
        }
        
        throw new Error(
          `❌ Authentication failed: User "${userName || username}" has role "${userRole || 'unknown'}", but consultant role is required.\n` +
          `   The user was redirected to /dashboard instead of /consultant.\n` +
          `   Solution: Set TEST_CONSULTANT_USERNAME to a consultant username (not an admin user like "rommel").\n` +
          `   Or unset TEST_CONSULTANT_USERNAME to use the default "test-consultant-portal" user.\n` +
          `   Current TEST_CONSULTANT_USERNAME: ${username}`
        );
      }
      
      // Verify consultant role via API even if redirected to /consultant (double-check)
      const authToken = await page.evaluate(() => {
        try {
          return localStorage.getItem('auth_token');
        } catch {
          return null;
        }
      });
      if (authToken) {
        try {
          const meResp = await page.request.get(`${baseURL}/api/auth/me`, {
            headers: { Authorization: `Bearer ${authToken}` }
          });
          if (meResp.ok()) {
            const user = await meResp.json() as { username?: string; role?: string };
            if (user.role !== 'consultant') {
              if (fs.existsSync(storageStatePath)) {
                fs.unlinkSync(storageStatePath);
                console.log('⚠️  Deleted invalid storage state file');
              }
              throw new Error(
                `❌ Authentication failed: User "${user.username}" has role "${user.role}", but consultant role is required.\n` +
                `   Solution: Set TEST_CONSULTANT_USERNAME to a consultant username.\n` +
                `   Current TEST_CONSULTANT_USERNAME: ${username}`
              );
            }
            console.log(`✅ Verified consultant role for user: ${user.username}`);
          }
        } catch (apiError) {
          // If API check fails, log warning but don't fail (might be network issue)
          console.warn('⚠️  Could not verify user role via API, but navigation succeeded');
        }
      }
    } catch (navError) {
      // Check for error messages on the page
      const errorElement = await page.locator('.text-red-600, [role="alert"], .bg-red-50').first();
      if (await errorElement.isVisible()) {
        const errorText = await errorElement.textContent();
        console.error(`❌ Login error: ${errorText}`);
        
        // Check if it's a rate limit error
        if (errorText?.includes('Too many') || errorText?.includes('rate limit')) {
          console.error('⚠️  Rate limit detected. Waiting 15 minutes and retrying is recommended.');
          console.error('   Or delete .auth files and wait for rate limit to reset.');
        }
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
    const dir = path.dirname(storageStatePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    await page.context().storageState({ path: storageStatePath });
    
    console.log('✅ Consultant authentication state saved successfully');
  } catch (error) {
    console.error('❌ Failed to authenticate consultant:', error);
    throw error;
  } finally {
    await browser.close();
  }
}

async function authenticateAdmin(config: FullConfig) {
  const username = process.env.TEST_ADMIN_USERNAME || 'e2e-admin';
  const password = process.env.TEST_ADMIN_PASSWORD || 'admin123';
  const baseURL = config.projects[0].use.baseURL || 'http://localhost:5173';
  const storageStatePath = path.join(__dirname, '../.auth/admin-auth.json');

  console.log(`\n📋 Admin E2E Setup`);
  console.log(`   Username: ${username}`);
  console.log(`   Base URL: ${baseURL}`);
  console.log(`   Note: User must have 'admin' role to access admin routes\n`);

  // Check if auth state exists and is valid

  // Check if auth state exists and is valid
  if (fs.existsSync(storageStatePath)) {
    try {
      const browser = await chromium.launch();
      const context = await browser.newContext({
        storageState: storageStatePath
      });
      const page = await context.newPage();
      
      // Test if auth state is still valid
      await page.goto(`${baseURL}/dashboard`, { waitUntil: 'networkidle', timeout: 10000 });
      const currentUrl = page.url();
      
      // If we're not redirected to login, auth is valid
      if (!currentUrl.includes('/login')) {
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
          token = null;
        }
        
        if (token) {
          // Verify token with API
          try {
            const meResp = await page.request.get(`${baseURL}/api/auth/me`, {
              headers: { Authorization: `Bearer ${token}` }
            });
            if (meResp.ok()) {
              const user = await meResp.json() as { role?: string };
              if (user.role === 'admin') {
                console.log('✅ Using existing admin auth state');
                await browser.close();
                return;
              }
            }
          } catch {
            // Token invalid, will re-authenticate
          }
        }
      }
      
      await browser.close();
      // Auth state invalid, delete it and re-authenticate
      fs.unlinkSync(storageStatePath);
      console.log('⚠️  Existing admin auth state invalid, re-authenticating...');
    } catch (error) {
      // If validation fails, delete and re-authenticate
      if (fs.existsSync(storageStatePath)) {
        fs.unlinkSync(storageStatePath);
      }
      console.log('⚠️  Failed to validate admin auth state, re-authenticating...');
    }
  }

  ensureDefaultE2EAdminUser();

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
    
    // Click submit and wait for navigation or error
    const clickPromise = page.click('button[type="submit"]');
    
    // Wait a bit for either navigation or error message
    await page.waitForTimeout(2000);
    
    // Check if we got a rate limit error before waiting for navigation
    const errorElement = await page.locator('.text-red-600, [role="alert"], .bg-red-50').first();
    if (await errorElement.isVisible()) {
      const errorText = await errorElement.textContent();
      if (errorText?.includes('Too many') || errorText?.includes('rate limit')) {
        console.error(`⚠️  Rate limit detected: ${errorText}`);
        console.error('   Skipping authentication. If auth state files exist, tests may still work.');
        console.error('   To fix: Wait 15 minutes for rate limit to reset, or use existing auth state files.');
        // Don't throw - allow tests to continue if auth state exists
        const adminStorageStatePath = path.join(__dirname, '../.auth/admin-auth.json');
        if (fs.existsSync(adminStorageStatePath)) {
          console.log('   Using existing auth state file (may be stale)...');
          await browser.close();
          return;
        }
        throw new Error(`Rate limit exceeded. Please wait 15 minutes or use existing auth state. Error: ${errorText}`);
      }
    }
    
    const navigationPromise = page.waitForURL(/\/(dashboard|consultant)/, { timeout: 18000 });
    await clickPromise;
    
    try {
      await navigationPromise;
      const finalUrl = page.url();
      console.log(`✅ Login successful, redirected to: ${finalUrl}`);
      
      // Verify the user is an admin (not consultant)
      // If redirected to /consultant, the user is likely a consultant
      if (finalUrl.includes('/consultant')) {
        // Check user role via API
        const authToken = await page.evaluate(() => {
          try {
            return localStorage.getItem('auth_token');
          } catch {
            return null;
          }
        });
        let userRole: string | undefined;
        let userName: string | undefined;
        
        if (authToken) {
          try {
            const meResp = await page.request.get(`${baseURL}/api/auth/me`, {
              headers: { Authorization: `Bearer ${authToken}` }
            });
            if (meResp.ok()) {
              const user = await meResp.json() as { username?: string; role?: string };
              userRole = user.role;
              userName = user.username;
            }
          } catch (apiError) {
            // API check failed, but we'll still throw error about redirect
          }
        }
        
        // Delete any existing storage state file to prevent using wrong credentials
        if (fs.existsSync(storageStatePath)) {
          fs.unlinkSync(storageStatePath);
          console.log('⚠️  Deleted invalid storage state file');
        }
        
        throw new Error(
          `❌ Authentication failed: User "${userName || username}" has role "${userRole || 'unknown'}", but admin role is required.\n` +
          `   The user was redirected to /consultant instead of /dashboard.\n` +
          `   Solution: Set TEST_ADMIN_USERNAME to an admin username.\n` +
          `   Current TEST_ADMIN_USERNAME: ${username}`
        );
      }
      
      // Verify admin role via API even if redirected to /dashboard (double-check)
      const authToken = await page.evaluate(() => {
        try {
          return localStorage.getItem('auth_token');
        } catch {
          return null;
        }
      });
      if (authToken) {
        try {
          const meResp = await page.request.get(`${baseURL}/api/auth/me`, {
            headers: { Authorization: `Bearer ${authToken}` }
          });
          if (meResp.ok()) {
            const user = await meResp.json() as { username?: string; role?: string };
            if (user.role !== 'admin') {
              if (fs.existsSync(storageStatePath)) {
                fs.unlinkSync(storageStatePath);
                console.log('⚠️  Deleted invalid storage state file');
              }
              throw new Error(
                `❌ Authentication failed: User "${user.username}" has role "${user.role}", but admin role is required.\n` +
                `   Solution: Set TEST_ADMIN_USERNAME to an admin username.\n` +
                `   Current TEST_ADMIN_USERNAME: ${username}`
              );
            }
            console.log(`✅ Verified admin role for user: ${user.username}`);
          }
        } catch (apiError) {
          // If API check fails, log warning but don't fail (might be network issue)
          console.warn('⚠️  Could not verify user role via API, but navigation succeeded');
        }
      }
    } catch (navError) {
      // Check for error messages on the page
      const errorElement = await page.locator('.text-red-600, [role="alert"], .bg-red-50').first();
      if (await errorElement.isVisible()) {
        const errorText = await errorElement.textContent();
        console.error(`❌ Login error: ${errorText}`);
        
        // Check if it's a rate limit error
        if (errorText?.includes('Too many') || errorText?.includes('rate limit')) {
          console.error('⚠️  Rate limit detected. Waiting 15 minutes and retrying is recommended.');
          console.error('   Or delete .auth files and wait for rate limit to reset.');
        }
        throw new Error(`Login failed: ${errorText}`);
      }
      
      // Take screenshot for debugging
      const screenshotPath = path.join(__dirname, '../.auth/admin-login-error.png');
      await page.screenshot({ path: screenshotPath, fullPage: true });
      console.error(`❌ Login timeout. Screenshot saved to: ${screenshotPath}`);
      console.error(`Current URL: ${page.url()}`);
      throw navError;
    }

    // Save authentication state
    const dir = path.dirname(storageStatePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    await page.context().storageState({ path: storageStatePath });
    
    console.log('✅ Admin authentication state saved successfully');
  } catch (error) {
    console.error('❌ Failed to authenticate admin:', error);
    throw error;
  } finally {
    await browser.close();
  }
}

async function globalSetup(config: FullConfig) {
  // Authenticate both consultant and admin users
  await authenticateConsultant(config);
  await authenticateAdmin(config);
}

export default globalSetup;

