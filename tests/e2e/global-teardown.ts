import { chromium, FullConfig, APIRequestContext } from '@playwright/test';
import { cleanupAllE2ETestCycles } from './helpers/admin-api';

async function globalTeardown(config: FullConfig) {
  try {
    const baseURL = config.projects[0]?.use?.baseURL || 'http://localhost:5173';
    const browser = await chromium.launch();
    const context = await browser.newContext({
      baseURL,
    });
    const request = context.request;

    console.log('\n🧹 Cleaning up any remaining E2E test cycles...');
    await cleanupAllE2ETestCycles(request as APIRequestContext);
    await browser.close();
  } catch (error) {
    // Don't fail the test run on cleanup errors
    console.warn('⚠️  Error during global teardown:', error);
  }
}

export default globalTeardown;
