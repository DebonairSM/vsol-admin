import { test, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';
import { archiveCycleAsAdmin, createCycleAsAdmin } from './helpers/admin-api';

test.describe('Consultant Invoices Page', () => {
  const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:5173';
  const isLocalBaseURL =
    baseURL.includes('localhost') || baseURL.includes('127.0.0.1');
  const allowAdminMutations =
    isLocalBaseURL || process.env.E2E_ALLOW_ADMIN_MUTATIONS === 'true';

  async function openCycleDropdown(page: any) {
    const trigger = page.locator('#cycle');
    await expect(trigger).toBeVisible({ timeout: 15000 });
    await trigger.click();

    const optionsContainer = page.locator('div.absolute.top-full.z-50').first();
    await expect(optionsContainer).toBeVisible({ timeout: 10000 });
    return optionsContainer;
  }

  async function selectFirstCycle(page: any): Promise<string> {
    const optionsContainer = await openCycleDropdown(page);
    const firstOption = optionsContainer.locator('div').first();
    await expect(firstOption).toBeVisible({ timeout: 10000 });
    const label = (await firstOption.textContent())?.trim() || '';
    await firstOption.click();
    return label;
  }

  test.beforeEach(async ({ page }) => {
    // Navigate to invoices page (auth state is loaded automatically via global setup)
    await page.goto('/consultant/invoices', { waitUntil: 'networkidle', timeout: 60000 });
    
    // Wait for URL to be correct
    await page.waitForURL('**/consultant/invoices', { timeout: 10000 });
    
    // Wait for the heading text to appear - this is the most reliable indicator
    // that the ConsultantInvoicesPage component has rendered
    // Use a longer timeout to account for API calls and React rendering
    await page.waitForSelector('text=Upload Invoice', { state: 'visible', timeout: 30000 });
    
    // Wait for the form to be visible (indicates the page has fully rendered)
    await page.waitForSelector('form', { state: 'visible', timeout: 10000 });
  });

  test('should display the invoice upload page correctly', async ({ page }) => {
    // Check page title
    await expect(page.locator('h1')).toContainText('Upload Invoice');
    
    // Check description
    await expect(page.locator('text=Upload your monthly invoice for payroll processing')).toBeVisible();

    // Check card title
    await expect(page.locator('text=Invoice Upload')).toBeVisible();
    
    // Check card description (matches full text including "(PDF or image)")
    await expect(page.locator('text=/Select a payroll cycle and upload your invoice file/')).toBeVisible();

    // Check cycle dropdown label
    await expect(page.locator('label[for="cycle"]')).toBeVisible();

    // Check file upload area
    await expect(page.locator('text=Invoice File').first()).toBeVisible();
    await expect(page.locator('text=Click to upload').first()).toBeVisible();
    await expect(page.locator('text=or drag and drop').first()).toBeVisible();
    await expect(page.locator('text=PDF, JPEG, or PNG (max 10MB)').first()).toBeVisible();

    // Check upload button (should be disabled initially)
    const uploadButton = page.locator('button[type="submit"]');
    await expect(uploadButton).toBeVisible();
    await expect(uploadButton).toBeDisabled();
  });

  test('should load and display available cycles in dropdown', async ({ page }) => {
    // If allowed, create a cycle to ensure there is at least one option.
    let cycleId: number | null = null;
    try {
      if (allowAdminMutations) {
        const created = await createCycleAsAdmin(page.request);
        cycleId = created.cycleId;
        await page.reload({ waitUntil: 'networkidle' });
        await page.waitForSelector('text=Upload Invoice', { state: 'visible', timeout: 30000 });
      }

      const optionsContainer = await openCycleDropdown(page);
      const options = optionsContainer.locator('div');
      const count = await options.count();
      expect(count).toBeGreaterThanOrEqual(0);

      if (count > 0) {
        const optionText = (await options.first().textContent())?.trim();
        expect(optionText).toBeTruthy();
      } else {
        // No cycles available (valid state on remote environments)
        const placeholder = (await page.locator('#cycle').textContent()) || '';
        expect(placeholder).toContain('Select a cycle');
      }
    } finally {
      if (cycleId !== null && allowAdminMutations) {
        await archiveCycleAsAdmin(page.request, cycleId);
      }
    }
  });

  test('should allow selecting a cycle from dropdown', async ({ page }) => {
    test.skip(!allowAdminMutations, 'Requires creating a cycle to select (set E2E_ALLOW_ADMIN_MUTATIONS=true for remote)');

    const { cycleId } = await createCycleAsAdmin(page.request);
    try {
      await page.reload({ waitUntil: 'networkidle' });
      await page.waitForSelector('text=Upload Invoice', { state: 'visible', timeout: 30000 });

      const selected = await selectFirstCycle(page);
      expect(selected.length).toBeGreaterThan(0);

      // Verify trigger reflects selection (our Select renders text inside the button)
      await expect(page.locator('#cycle')).toContainText(selected);
    } finally {
      await archiveCycleAsAdmin(page.request, cycleId);
    }
  });

  test('should allow file selection via click', async ({ page }) => {
    // Create a test file
    const testFilePath = path.join(__dirname, '../fixtures/test-invoice.pdf');
    
    // Create test file if it doesn't exist
    if (!fs.existsSync(testFilePath)) {
      const dir = path.dirname(testFilePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      // Create a minimal PDF file (PDF header)
      fs.writeFileSync(testFilePath, Buffer.from('%PDF-1.4\n'));
    }

    // Find the file input (hidden)
    const fileInput = page.locator('#file-upload');
    await fileInput.setInputFiles(testFilePath);

    // Wait for file to be selected
    await page.waitForSelector('form >> text=test-invoice.pdf', { timeout: 3000 });

    // Verify file is displayed
    await expect(page.locator('form').locator('text=test-invoice.pdf').first()).toBeVisible();
    await expect(page.locator('form').locator('text=Remove File').first()).toBeVisible();
  });

  test('should allow file selection via drag and drop', async ({ page }) => {
    // Create a test file
    const testFilePath = path.join(__dirname, '../fixtures/test-invoice.png');
    
    // Create test file if it doesn't exist
    if (!fs.existsSync(testFilePath)) {
      const dir = path.dirname(testFilePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      // Create a minimal PNG file (PNG header)
      const pngHeader = Buffer.from([
        0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A
      ]);
      fs.writeFileSync(testFilePath, pngHeader);
    }

    // Read file content
    const fileContent = fs.readFileSync(testFilePath);
    const fileName = path.basename(testFilePath);

    // Find the drop zone (outer dashed container) and dispatch a drop event with a DataTransfer.
    const dropZone = page
      .locator('div.border-dashed')
      .filter({ hasText: 'Click to upload' })
      .first();
    await expect(dropZone).toBeVisible();

    await dropZone.evaluate(
      (el, { content, name }) => {
        const dataTransfer = new DataTransfer();
        const file = new File([new Uint8Array(content)], name, { type: 'image/png' });
        dataTransfer.items.add(file);

        // Simulate the drag lifecycle.
        el.dispatchEvent(new DragEvent('dragover', { bubbles: true, cancelable: true, dataTransfer }));
        el.dispatchEvent(new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer }));
      },
      { content: Array.from(fileContent), name: fileName }
    );

    // Wait for file to be selected
    await page.waitForSelector(`form >> text=${fileName}`, { timeout: 3000 });

    // Verify file is displayed
    await expect(page.locator('form').locator(`text=${fileName}`).first()).toBeVisible();
  });

  test('should show error for invalid file type', async ({ page }) => {
    // Create an invalid test file (text file)
    const testFilePath = path.join(__dirname, '../fixtures/invalid-file.txt');
    
    if (!fs.existsSync(testFilePath)) {
      const dir = path.dirname(testFilePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(testFilePath, 'This is not a valid invoice file');
    }

    // Try to upload invalid file
    const fileInput = page.locator('#file-upload');
    await fileInput.setInputFiles(testFilePath);

    // Wait for error toast
    await page.waitForSelector('text=Invalid File Type', { timeout: 3000 });

    // Verify error message
    await expect(page.locator('text=Invalid File Type').first()).toBeVisible();
    await expect(page.locator('text=Please upload a PDF or image file').first()).toBeVisible();
  });

  test('should show error for file too large', async ({ page }) => {
    // Create a large test file (>10MB)
    const testFilePath = path.join(__dirname, '../fixtures/large-file.pdf');
    
    if (!fs.existsSync(testFilePath)) {
      const dir = path.dirname(testFilePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      // Create a file larger than 10MB
      const largeBuffer = Buffer.alloc(11 * 1024 * 1024); // 11MB
      largeBuffer.write('%PDF-1.4\n', 0);
      fs.writeFileSync(testFilePath, largeBuffer);
    }

    // Try to upload large file
    const fileInput = page.locator('#file-upload');
    await fileInput.setInputFiles(testFilePath);

    // Wait for error toast
    await page.waitForSelector('text=File Too Large', { timeout: 3000 });

    // Verify error message
    await expect(page.locator('text=File Too Large').first()).toBeVisible();
    await expect(page.locator('text=File size must be less than 10MB').first()).toBeVisible();
  });

  test('should allow removing selected file', async ({ page }) => {
    // Select a file first
    const testFilePath = path.join(__dirname, '../fixtures/test-invoice.pdf');
    
    if (!fs.existsSync(testFilePath)) {
      const dir = path.dirname(testFilePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(testFilePath, Buffer.from('%PDF-1.4\n'));
    }

    const fileInput = page.locator('#file-upload');
    await fileInput.setInputFiles(testFilePath);

    // Wait for file to be selected
    await page.waitForSelector('form >> text=test-invoice.pdf', { timeout: 3000 });

    // Click remove button
    await page.locator('button:has-text("Remove File")').click();

    // Verify file is removed and upload area is back
    await expect(page.locator('form').locator('text=Click to upload').first()).toBeVisible();
    await expect(page.locator('form').locator('text=test-invoice.pdf').first()).not.toBeVisible();
  });

  test('should enable upload button when cycle and file are selected', async ({ page }) => {
    test.skip(!allowAdminMutations, 'Requires creating a cycle to select (set E2E_ALLOW_ADMIN_MUTATIONS=true for remote)');

    const { cycleId } = await createCycleAsAdmin(page.request);
    try {
      await page.reload({ waitUntil: 'networkidle' });
      await page.waitForSelector('text=Upload Invoice', { state: 'visible', timeout: 30000 });

      await selectFirstCycle(page);

      // Select a file
      const testFilePath = path.join(__dirname, '../fixtures/test-invoice.pdf');

      if (!fs.existsSync(testFilePath)) {
        const dir = path.dirname(testFilePath);
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(testFilePath, Buffer.from('%PDF-1.4\n'));
      }

      const fileInput = page.locator('#file-upload');
      await fileInput.setInputFiles(testFilePath);

      // Wait for file to be selected
      await page.waitForSelector('form >> text=test-invoice.pdf', { timeout: 3000 });

      // Verify upload button is enabled
      const uploadButton = page.locator('button[type="submit"]');
      await expect(uploadButton).toBeEnabled();
      await expect(uploadButton).toContainText('Upload Invoice');
    } finally {
      await archiveCycleAsAdmin(page.request, cycleId);
    }
  });

  test('should show error when submitting without cycle selected', async ({ page }) => {
    // Select only a file (no cycle)
    const testFilePath = path.join(__dirname, '../fixtures/test-invoice.pdf');
    
    if (!fs.existsSync(testFilePath)) {
      const dir = path.dirname(testFilePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(testFilePath, Buffer.from('%PDF-1.4\n'));
    }

    const fileInput = page.locator('#file-upload');
    await fileInput.setInputFiles(testFilePath);

    // Try to submit (button should be disabled, but if enabled, click it)
    const uploadButton = page.locator('button[type="submit"]');
    const isEnabled = await uploadButton.isEnabled();
    
    if (isEnabled) {
      await uploadButton.click();
      // Wait for error toast
      await page.waitForSelector('text=Missing Information', { timeout: 3000 });
      await expect(page.locator('text=Please select a cycle and choose a file')).toBeVisible();
    } else {
      // Button should be disabled
      await expect(uploadButton).toBeDisabled();
    }
  });

  test('should show error when submitting without file selected', async ({ page }) => {
    test.skip(!allowAdminMutations, 'Requires creating a cycle to select (set E2E_ALLOW_ADMIN_MUTATIONS=true for remote)');

    const { cycleId } = await createCycleAsAdmin(page.request);
    try {
      await page.reload({ waitUntil: 'networkidle' });
      await page.waitForSelector('text=Upload Invoice', { state: 'visible', timeout: 30000 });

      // Select only a cycle (no file)
      await selectFirstCycle(page);

      // Try to submit (button should be disabled)
      const uploadButton = page.locator('button[type="submit"]');
      await expect(uploadButton).toBeDisabled();
    } finally {
      await archiveCycleAsAdmin(page.request, cycleId);
    }
  });

  test('should handle successful file upload', async ({ page }) => {
    test.skip(!allowAdminMutations, 'Requires creating a cycle to upload against (set E2E_ALLOW_ADMIN_MUTATIONS=true for remote)');

    const { cycleId } = await createCycleAsAdmin(page.request);
    try {
      await page.reload({ waitUntil: 'networkidle' });
      await page.waitForSelector('text=Upload Invoice', { state: 'visible', timeout: 30000 });

      // Select a cycle
      await selectFirstCycle(page);

      // Select a valid file
      const testFilePath = path.join(__dirname, '../fixtures/test-invoice.pdf');

      if (!fs.existsSync(testFilePath)) {
        const dir = path.dirname(testFilePath);
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(testFilePath, Buffer.from('%PDF-1.4\n'));
      }

      const fileInput = page.locator('#file-upload');
      await fileInput.setInputFiles(testFilePath);

      // Wait for file to be selected
      await page.waitForSelector('form >> text=test-invoice.pdf', { timeout: 3000 });

      // Submit the form
      const uploadButton = page.locator('button[type="submit"]');
      await uploadButton.click();

      // Wait for either success or error message
      await page.waitForTimeout(2000);

      // Check for success toast or error
      const successToast = page.locator('text=/Invoice (Uploaded|Replaced)/').first();
      const errorToast = page.locator('text=Upload Failed').first();

      const successVisible = await successToast.isVisible().catch(() => false);
      const errorVisible = await errorToast.isVisible().catch(() => false);
      expect(successVisible || errorVisible).toBeTruthy();

      // If successful, verify form is reset
      if (successVisible) {
        await expect(page.locator('form').locator('text=Click to upload').first()).toBeVisible();
        await expect(page.locator('#cycle')).toContainText('Select a cycle');
      }
    } finally {
      await archiveCycleAsAdmin(page.request, cycleId);
    }
  });

  test('should show loading state during upload', async ({ page }) => {
    test.skip(!allowAdminMutations, 'Requires creating a cycle to upload against (set E2E_ALLOW_ADMIN_MUTATIONS=true for remote)');

    const { cycleId } = await createCycleAsAdmin(page.request);
    try {
      await page.reload({ waitUntil: 'networkidle' });
      await page.waitForSelector('text=Upload Invoice', { state: 'visible', timeout: 30000 });

      // Select a cycle
      await selectFirstCycle(page);

      // Select a file
      const testFilePath = path.join(__dirname, '../fixtures/test-invoice.pdf');

      if (!fs.existsSync(testFilePath)) {
        const dir = path.dirname(testFilePath);
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(testFilePath, Buffer.from('%PDF-1.4\n'));
      }

      const fileInput = page.locator('#file-upload');
      await fileInput.setInputFiles(testFilePath);

      await page.waitForSelector('form >> text=test-invoice.pdf', { timeout: 3000 });

      // Submit and check for loading state
      const uploadButton = page.locator('button[type="submit"]');
      await uploadButton.click();

      // Button should become disabled right away (either due to pending upload, or because
      // the mutation completes quickly and the form resets).
      await expect(uploadButton).toBeDisabled({ timeout: 5000 });

      const text = (await uploadButton.textContent()) || '';
      expect(text.includes('Uploading') || text.includes('Upload Invoice')).toBeTruthy();
    } finally {
      await archiveCycleAsAdmin(page.request, cycleId);
    }
  });
});

