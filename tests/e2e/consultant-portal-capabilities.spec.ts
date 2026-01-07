import { test, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';
import { archiveCycleAsAdmin, createCycleAsAdmin } from './helpers/admin-api';

test.describe('Consultant Portal Capabilities', () => {
  // This suite shares server-side state (admin-created cycle) and hits auth endpoints.
  // Run serially to avoid triggering the auth rate limiter when Playwright runs tests fully-parallel.
  test.describe.configure({ mode: 'serial' });

  let cycleId: number | null = null;
  let monthLabel: string | null = null;

  test.beforeAll(async ({ request }) => {
    const created = await createCycleAsAdmin(request);
    cycleId = created.cycleId;
    monthLabel = created.monthLabel;
  });

  test.afterAll(async ({ request }) => {
    if (cycleId) {
      await archiveCycleAsAdmin(request, cycleId);
    }
  });

  test('portal dashboard renders and navigation entry points exist', async ({ page }) => {
    await page.goto('/consultant', { waitUntil: 'networkidle', timeout: 60000 });
    await page.waitForSelector('text=Consultant Portal', { state: 'visible', timeout: 30000 });

    await expect(page.locator('h1')).toContainText('Consultant Portal');
    await expect(page.getByRole('link', { name: 'Upload Invoice' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'My Profile' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'My Vacations' })).toBeVisible();
  });

  test('invoice upload works end-to-end for a newly created cycle', async ({ page }) => {
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

    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForSelector('text=My Profile', { state: 'visible', timeout: 30000 });
    await expect(page.locator('#phone')).toHaveValue(newPhone);
  });

  test('birthDate typed input does not shift by timezone (regression)', async ({ page }) => {
    // Known issue: typing into <input type="date"> currently shifts by timezone (off-by-one).
    // Keep this as an expected failure until the underlying bug is fixed.
    test.fail(true, 'Known issue: typed birthDate shifts by timezone (off-by-one)');

    await page.goto('/consultant/profile', { waitUntil: 'networkidle', timeout: 60000 });
    await page.waitForSelector('text=My Profile', { state: 'visible', timeout: 30000 });

    const birthDateInput = page.locator('#birthDate');
    await expect(birthDateInput).toBeVisible();

    const expectedBirthDate = '1990-01-15';
    await birthDateInput.fill(expectedBirthDate);

    const saveButton = page.locator('button[type="submit"]:has-text("Save Changes")');
    await expect(saveButton).toBeEnabled();

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
    await expect(page.locator('#birthDate')).toHaveValue(expectedBirthDate);
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
    // Known issue: typed dates can shift by timezone (off-by-one). Keep this as expected-fail until fixed.
    test.fail(true, 'Known issue: typed vacation date shifts by timezone (off-by-one)');

    await page.goto('/consultant/vacations', { waitUntil: 'networkidle', timeout: 60000 });
    await page.waitForSelector('text=My Vacations', { state: 'visible', timeout: 30000 });

    await page.locator('button:has-text("Add Day")').click();
    await page.waitForSelector('text=Create Vacation Day', { state: 'visible', timeout: 10000 });

    const vacationDate = '2025-04-21';
    const vacationNotes = `E2E vacation ${Date.now()}`;

    await page.locator('#day-date').fill(vacationDate);
    await page.locator('#day-notes').fill(vacationNotes);
    await page.locator('button:has-text("Create")').click();
    await page.waitForSelector('text=Success', { timeout: 15000 });

    // Table shows formatted date; current formatDate() uses en-US with UTC components.
    // This assertion is expected to FAIL if the bug reproduces (showing Apr 20 instead of Apr 21).
    const vacationsTable = page.locator('table.w-full.caption-bottom.text-sm');
    await expect(vacationsTable).toContainText('Apr 21, 2025');
    await expect(vacationsTable).toContainText(vacationNotes);
  });
});

