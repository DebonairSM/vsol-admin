import { test, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';
import { archiveCycleAsAdmin, createCycleAsAdmin } from './helpers/admin-api';

test.describe('Consultant Portal Capabilities', () => {
  // These tests mutate shared account state (profile fields, vacations).
  // Run serially to avoid cross-test interference.
  test.describe.configure({ mode: 'serial' });

  const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:5173';
  const isLocalBaseURL =
    baseURL.includes('localhost') || baseURL.includes('127.0.0.1');
  const allowAdminMutations = isLocalBaseURL || process.env.E2E_ALLOW_ADMIN_MUTATIONS === 'true';

  test('portal dashboard renders and navigation entry points exist', async ({ page }) => {
    await page.goto('/consultant', { waitUntil: 'networkidle', timeout: 60000 });
    
    // Check if we were redirected to dashboard (indicates non-consultant user)
    const currentUrl = page.url();
    if (currentUrl.includes('/dashboard')) {
      // Verify user role via API to provide better error message
      const authToken = await page.evaluate(() => localStorage.getItem('auth_token'));
      if (authToken) {
        const meResp = await page.request.get(`${baseURL}/api/auth/me`, {
          headers: { Authorization: `Bearer ${authToken}` }
        });
        if (meResp.ok()) {
          const user = await meResp.json() as { username?: string; role?: string };
          throw new Error(
            `Test requires consultant user, but authenticated as ${user.username} (role: ${user.role}). ` +
            `Please ensure TEST_CONSULTANT_USERNAME and TEST_CONSULTANT_PASSWORD are set correctly, ` +
            `or delete tests/.auth/consultant-auth.json to regenerate authentication state.`
          );
        }
      }
      throw new Error(
        `Expected to access /consultant but was redirected to ${currentUrl}. ` +
        `This usually means the authenticated user is not a consultant. ` +
        `Please ensure you're using consultant credentials (not admin).`
      );
    }
    
    await page.waitForSelector('text=Consultant Portal', { state: 'visible', timeout: 30000 });

    await expect(page.locator('h1')).toContainText('Consultant Portal');
    await expect(page.getByRole('link', { name: 'Upload Invoice' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'My Profile' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'My Vacations' })).toBeVisible();
  });

  test('invoice upload works end-to-end for a newly created cycle', async ({ page }) => {
    test.skip(!allowAdminMutations, 'Skipping invoice upload: requires admin mutations (cycle creation). Set E2E_ALLOW_ADMIN_MUTATIONS=true to enable on remote baseURL.');

    // Create a cycle for this test run (so invoice upload has something to attach to)
    const { cycleId, monthLabel } = await createCycleAsAdmin(page.request);

    await page.goto('/consultant/invoices', { waitUntil: 'networkidle', timeout: 60000 });
    await page.waitForSelector('text=Upload Invoice', { state: 'visible', timeout: 30000 });

    // Select the cycle we created
    expect(monthLabel).toBeTruthy();
    const cycleDropdown = page.locator('#cycle');
    await expect(cycleDropdown).toBeVisible();
    await cycleDropdown.click();

    // Custom Select implementation doesn't use ARIA roles; select by visible text inside the open dropdown.
    const cycleOptions = page.locator('div.absolute.top-full.z-50');
    await expect(cycleOptions).toBeVisible({ timeout: 10000 });
    await cycleOptions.getByText(monthLabel || '').click();
    await expect(cycleDropdown).toContainText(monthLabel || '');

    // Upload a PDF fixture
    const testFilePath = path.join(__dirname, '../fixtures/test-invoice.pdf');
    if (!fs.existsSync(testFilePath)) {
      const dir = path.dirname(testFilePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(testFilePath, Buffer.from('%PDF-1.4\n'));
    }

    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(testFilePath);
    await page.waitForSelector('text=test-invoice.pdf', { timeout: 5000 });

    const uploadButton = page.locator('button[type="submit"]');
    await expect(uploadButton).toBeEnabled();
    await uploadButton.click();

    // Success is expected here (cycle exists and file is valid).
    await expect(page.locator('text=/Invoice (Uploaded|Replaced)/').first()).toBeVisible({ timeout: 15000 });

    // Verify invoice appears in list for this cycle
    await expect(page.locator(`text=${monthLabel}`)).toBeVisible({ timeout: 15000 });

    // Best-effort click the View/Download buttons (these are client-side blob ops)
    const invoiceRow = page.locator(`div:has-text("${monthLabel}")`).first();
    await invoiceRow.locator('button:has-text("View")').first().click();
    await invoiceRow.locator('button:has-text("Download")').first().click();

    // Best-effort cleanup: archive the test cycle
    await archiveCycleAsAdmin(page.request, cycleId);
  });

  test('profile updates persist', async ({ page }) => {
    await page.goto('/consultant/profile', { waitUntil: 'networkidle', timeout: 60000 });
    await page.waitForSelector('text=My Profile', { state: 'visible', timeout: 30000 });

    // Update a simple field and persist it
    const phoneInput = page.locator('#phone');
    await expect(phoneInput).toBeVisible();
    // Use a unique value each run so `hasChanges` flips and the Save button enables.
    const suffix = Date.now().toString().slice(-8);
    const newPhone = `+55 11 7${suffix.slice(0, 4)}-${suffix.slice(4)}`;
    await phoneInput.fill(newPhone);

    const saveButton = page.locator('button[type="submit"]:has-text("Save Changes")');
    await expect(saveButton).toBeEnabled();
    const savePhoneResp = page.waitForResponse(
      (r) =>
        r.url().includes('/consultant/profile') &&
        ['PUT', 'PATCH'].includes(r.request().method()),
      { timeout: 30000 }
    );
    await saveButton.click();
    const phoneResp = await savePhoneResp;
    if (!phoneResp.ok()) {
      throw new Error(
        `[E2E] Profile save failed (status ${phoneResp.status()}). Body: ${await phoneResp.text()}`
      );
    }

    const reloadProfileResp = page.waitForResponse(
      (r) =>
        r.url().includes('/consultant/profile') &&
        r.request().method() === 'GET',
      { timeout: 30000 }
    );
    await page.reload({ waitUntil: 'networkidle' });
    await reloadProfileResp;
    await page.waitForSelector('text=My Profile', { state: 'visible', timeout: 30000 });
    await expect(page.locator('#phone')).toHaveValue(newPhone, { timeout: 15000 });
  });

  test('birthDate typed input does not shift by timezone (regression)', async ({ page }) => {
    await page.goto('/consultant/profile', { waitUntil: 'networkidle', timeout: 60000 });
    await page.waitForSelector('text=My Profile', { state: 'visible', timeout: 30000 });

    const birthDateInput = page.locator('#birthDate');
    await expect(birthDateInput).toBeVisible();

    // Ensure we actually change the value so the Save button becomes enabled.
    const currentBirthDate = await birthDateInput.inputValue();
    const desiredBirthDate = currentBirthDate === '1990-01-15' ? '1990-01-16' : '1990-01-15';
    await birthDateInput.fill(desiredBirthDate);

    const saveButton = page.locator('button[type="submit"]:has-text("Save Changes")');
    await expect(saveButton).toBeEnabled({ timeout: 15000 });

    const saveBirthDateResp = page.waitForResponse(
      (r) =>
        r.url().includes('/consultant/profile') &&
        ['PUT', 'PATCH'].includes(r.request().method()),
      { timeout: 30000 }
    );
    await saveButton.click();
    const birthResp = await saveBirthDateResp;
    if (!birthResp.ok()) {
      throw new Error(
        `[E2E] Birth date save failed (status ${birthResp.status()}). Body: ${await birthResp.text()}`
      );
    }

    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForSelector('text=My Profile', { state: 'visible', timeout: 30000 });
    await expect(page.locator('#birthDate')).toHaveValue(desiredBirthDate);
  });

  test('equipment can be created and edited', async ({ page }) => {
    await page.goto('/consultant/equipment', { waitUntil: 'networkidle', timeout: 60000 });
    await page.waitForSelector('text=My Equipment', { state: 'visible', timeout: 30000 });

    await page.locator('button:has-text("Add Equipment")').click();
    await page.waitForSelector('text=Add Equipment', { state: 'visible', timeout: 10000 });

    const deviceName = `E2E Device ${Date.now()}`;
    await page.locator('#deviceName').fill(deviceName);
    await page.locator('button:has-text("Add Equipment")').last().click();
    await page.waitForSelector('text=Success', { timeout: 15000 });

    await expect(page.locator(`text=${deviceName}`)).toBeVisible({ timeout: 15000 });

    // Edit the newly created equipment row
    const equipmentRow = page.locator('tr', { hasText: deviceName });
    await equipmentRow.locator('button').first().click();
    await page.waitForSelector('text=Edit Equipment', { state: 'visible', timeout: 10000 });

    const modelValue = 'Model 2026';
    await page.locator('#edit-model').fill(modelValue);
    await page.locator('button:has-text("Update Equipment")').click();
    await page.waitForSelector('text=Success', { timeout: 15000 });

    await expect(page.locator('tr', { hasText: deviceName })).toContainText(modelValue);
  });

  test('vacation day created by typing date should not shift to previous day (regression)', async ({
    page,
  }) => {
    let vacationId: number | null = null;
    const vacationDate = '2025-04-21';
    const vacationNotes = `E2E vacation ${Date.now()}`;
    let accessToken: string | null = null;

    try {
      await page.goto('/consultant/vacations', { waitUntil: 'networkidle', timeout: 60000 });
      await page.waitForSelector('text=My Vacations', { state: 'visible', timeout: 30000 });

      // Ensure we can authenticate API cleanup calls (consultant auth token is stored in localStorage).
      // Note: `page.request` does NOT automatically include localStorage-based auth.
      accessToken = await page.evaluate(() => localStorage.getItem('auth_token'));
      if (!accessToken) {
        throw new Error('[E2E] Missing auth_token in localStorage; cannot perform authenticated cleanup');
      }

      // First, check if a vacation for this date already exists via API and delete it
      // This handles the case where a previous test run didn't clean up
      try {
        const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:5173';
        // Use /api path (works for both localhost proxy and remote URLs)
        const apiURL = `${baseURL}/api/consultant/vacations`;
        const vacationsResp = await page.request.get(apiURL, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });
        if (vacationsResp.ok()) {
          const vacations = (await vacationsResp.json()) as Array<{
            id: number;
            vacationDate: string;
          }>;
          // Match by ISO YYYY-MM-DD to avoid timezone shifts (API returns UTC timestamps).
          const matches = vacations.filter((v) => {
            const isoDate = typeof v.vacationDate === 'string'
              ? v.vacationDate.split('T')[0]
              : '';
            return isoDate === vacationDate;
          });

          for (const match of matches) {
            await page.request.delete(`${baseURL}/api/consultant/vacations/${match.id}`, {
              headers: {
                Authorization: `Bearer ${accessToken}`,
              },
            });
          }

          if (matches.length > 0) {
            // Wait a bit for the deletion(s) to complete and refresh UI state
            await page.waitForTimeout(500);
            await page.reload({ waitUntil: 'networkidle' });
            await page.waitForSelector('text=My Vacations', { state: 'visible', timeout: 10000 });
          }
        }
      } catch (error) {
        // Best-effort: if API cleanup fails, the create may still fail with "already exists".
        // eslint-disable-next-line no-console
        console.warn('[E2E] API cleanup failed:', error);
      }

      await page.locator('button:has-text("Add Day")').click();
      await page.waitForSelector('text=Create Vacation Day', { state: 'visible', timeout: 10000 });

      await page.locator('#day-date').fill(vacationDate);
      await page.locator('#day-notes').fill(vacationNotes);
      const createVacationResp = page.waitForResponse(
        (r) =>
          r.url().includes('/consultant/vacations') &&
          r.request().method() === 'POST',
        { timeout: 30000 }
      );
      await page.locator('button:has-text("Create")').click();
      const vacResp = await createVacationResp;
      if (!vacResp.ok()) {
        throw new Error(
          `[E2E] Create vacation failed (status ${vacResp.status()}). Body: ${await vacResp.text()}`
        );
      }

      // Extract vacation ID from response for cleanup
      const vacationData = await vacResp.json();
      vacationId = vacationData.id;

      // Table shows formatted date; current formatDate() uses en-US with UTC components.
      // This assertion is expected to FAIL if the bug reproduces (showing Apr 20 instead of Apr 21).
      const vacationsTable = page.locator('table.w-full.caption-bottom.text-sm');
      await expect(vacationsTable).toContainText('Apr 21, 2025', { timeout: 15000 });
      await expect(vacationsTable).toContainText(vacationNotes, { timeout: 15000 });
    } finally {
      // Cleanup: delete the vacation day if it was created
      if (vacationId !== null) {
        try {
          await page.goto('/consultant/vacations', { waitUntil: 'networkidle' });
          await page.waitForSelector('text=My Vacations', { state: 'visible', timeout: 10000 });
          
          // Try to delete via API first (more reliable)
          try {
            const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:5173';
            const deleteResp = await page.request.delete(
              `${baseURL}/api/consultant/vacations/${vacationId}`,
              {
                headers: {
                  ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
                },
              }
            );
            if (deleteResp.ok()) {
              return; // Successfully deleted via API
            }
          } catch (error) {
            // Fall back to UI deletion if API fails
          }
          
          // Fallback: delete via UI
          await page.goto('/consultant/vacations', { waitUntil: 'networkidle' });
          await page.waitForSelector('text=My Vacations', { state: 'visible', timeout: 10000 });
          
          // Find the vacation row by notes (more reliable than date)
          const vacationRow = page.locator(`tr:has-text("${vacationNotes}")`).first();
          if (await vacationRow.count() > 0) {
            const deleteBtn = vacationRow.locator('button').first(); // Delete button is the first button in Actions column
            if (await deleteBtn.count() > 0) {
              // Deletion prompts a confirm() dialog.
              page.once('dialog', (dialog) => dialog.accept().catch(() => {}));
              const deleteResp = page.waitForResponse(
                (r) =>
                  r.url().includes('/consultant/vacations/') &&
                  r.request().method() === 'DELETE',
                { timeout: 10000 }
              );
              await deleteBtn.click();
              await deleteResp.catch(() => {
                // Best-effort cleanup: don't fail test if cleanup fails
              });
            }
          }
        } catch (error) {
          // Best-effort cleanup: don't fail test if cleanup fails
          // eslint-disable-next-line no-console
          console.warn(`[E2E] Failed to cleanup vacation day ${vacationId}:`, error);
        }
      }
    }
  });
});

