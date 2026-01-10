import { defineConfig, devices } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:5173';
const isLocalBaseURL =
  baseURL.includes('localhost') || baseURL.includes('127.0.0.1');

// Storage state paths (global setup will create these)
const consultantStorageState = path.join(__dirname, 'tests/.auth/consultant-auth.json');
const adminStorageState = path.join(__dirname, 'tests/.auth/admin-auth.json');
const hasConsultantStorage = fs.existsSync(consultantStorageState);
const hasAdminStorage = fs.existsSync(adminStorageState);

export default defineConfig({
  testDir: './tests/e2e',
  globalSetup: require.resolve('./tests/e2e/global-setup.ts'),
  globalTeardown: require.resolve('./tests/e2e/global-teardown.ts'),
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL,
    locale: 'pt-BR',
    timezoneId: 'America/Sao_Paulo',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      name: 'consultant',
      testMatch: /^.*consultant.*\.spec\.ts$/,
      use: {
        ...devices['Desktop Chrome'],
        ...(hasConsultantStorage ? { storageState: consultantStorageState } : {}),
      },
    },
    {
      name: 'admin',
      testMatch: /^(admin|auth).*\.spec\.ts$/,
      use: {
        ...devices['Desktop Chrome'],
        ...(hasAdminStorage ? { storageState: adminStorageState } : {}),
      },
    },
  ],

  // Only start the local dev server when testing localhost.
  // When targeting a remote baseURL (e.g. production), do not start any webServer.
  ...(isLocalBaseURL
    ? {
        webServer: {
          command: 'pnpm dev',
          url: baseURL,
          reuseExistingServer: !process.env.CI,
          timeout: 120 * 1000,
        },
      }
    : {}),
});

