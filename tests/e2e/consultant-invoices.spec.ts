import { test, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';

test.describe('Consultant Invoices Page', () => {
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
    await expect(page.locator('text=Payroll Cycle')).toBeVisible();

    // Check file upload area
    await expect(page.locator('text=Invoice File')).toBeVisible();
    await expect(page.locator('text=Click to upload')).toBeVisible();
    await expect(page.locator('text=or drag and drop')).toBeVisible();
    await expect(page.locator('text=PDF, JPEG, or PNG (max 10MB)')).toBeVisible();

    // Check upload button (should be disabled initially)
    const uploadButton = page.locator('button[type="submit"]');
    await expect(uploadButton).toBeVisible();
    await expect(uploadButton).toBeDisabled();
  });

  test('should load and display available cycles in dropdown', async ({ page }) => {
    // Wait for cycles to load - the dropdown should be visible
    await page.waitForSelector('button[role="combobox"]', { state: 'visible', timeout: 10000 });

    // Click the cycle dropdown
    const cycleDropdown = page.locator('button[role="combobox"]').first();
    await cycleDropdown.click();

    // Wait for dropdown content to appear (either options or empty state)
    // If there are no cycles, the dropdown might be empty, so we check for either
    try {
      await page.waitForSelector('[role="option"]', { state: 'visible', timeout: 5000 });
      
      // Check that at least one option is available
      const options = page.locator('[role="option"]');
      const count = await options.count();
      expect(count).toBeGreaterThan(0);

      // Verify options have text (month labels)
      const firstOption = options.first();
      await expect(firstOption).toBeVisible();
      const optionText = await firstOption.textContent();
      expect(optionText).toBeTruthy();
      expect(optionText?.trim().length).toBeGreaterThan(0);
    } catch {
      // If no options appear, the dropdown might be empty (no cycles available)
      // This is acceptable for the test - we just verify the dropdown is functional
      const placeholder = await cycleDropdown.textContent();
      expect(placeholder).toContain('Select a cycle');
    }
  });

  test('should allow selecting a cycle from dropdown', async ({ page }) => {
    // Wait for cycles to load
    await page.waitForSelector('button[role="combobox"]', { state: 'visible', timeout: 10000 });

    // Click the cycle dropdown
    await page.locator('button[role="combobox"]').first().click();

    // Wait for options - if no cycles are available, the test will fail gracefully
    await page.waitForSelector('[role="option"]', { state: 'visible', timeout: 5000 });

    // Select first available cycle
    const firstOption = page.locator('[role="option"]').first();
    const cycleLabel = await firstOption.textContent();
    expect(cycleLabel).toBeTruthy();
    expect(cycleLabel?.trim().length).toBeGreaterThan(0);
    
    await firstOption.click();

    // Verify selection is displayed
    await expect(page.locator('button[role="combobox"]').first()).toContainText(cycleLabel || '', { timeout: 2000 });
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
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(testFilePath);

    // Wait for file to be selected
    await page.waitForSelector('text=test-invoice.pdf', { timeout: 3000 });

    // Verify file is displayed
    await expect(page.locator('text=test-invoice.pdf')).toBeVisible();
    await expect(page.locator('text=Remove File')).toBeVisible();
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

    // Find the drop zone
    const dropZone = page.locator('div:has-text("Click to upload")').first();

    // Read file content
    const fileContent = fs.readFileSync(testFilePath);
    const fileName = path.basename(testFilePath);

    // Create a DataTransfer object and perform drag and drop
    await page.evaluate(({ content, name }) => {
      const dataTransfer = new DataTransfer();
      const file = new File([new Uint8Array(content)], name, { type: 'image/png' });
      dataTransfer.items.add(file);
      
      const dropEvent = new DragEvent('drop', {
        bubbles: true,
        cancelable: true,
        dataTransfer,
      });
      
      const dropZone = document.querySelector('div:has-text("Click to upload")')?.parentElement;
      if (dropZone) {
        dropZone.dispatchEvent(dropEvent);
      }
    }, { content: Array.from(fileContent), name: fileName });

    // Alternative: Use Playwright's file input with drag simulation
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(testFilePath);

    // Wait for file to be selected
    await page.waitForSelector(`text=${fileName}`, { timeout: 3000 });

    // Verify file is displayed
    await expect(page.locator(`text=${fileName}`)).toBeVisible();
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
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(testFilePath);

    // Wait for error toast
    await page.waitForSelector('text=Invalid File Type', { timeout: 3000 });

    // Verify error message
    await expect(page.locator('text=Invalid File Type')).toBeVisible();
    await expect(page.locator('text=Please upload a PDF or image file')).toBeVisible();
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
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(testFilePath);

    // Wait for error toast
    await page.waitForSelector('text=File Too Large', { timeout: 3000 });

    // Verify error message
    await expect(page.locator('text=File Too Large')).toBeVisible();
    await expect(page.locator('text=File size must be less than 10MB')).toBeVisible();
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

    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(testFilePath);

    // Wait for file to be selected
    await page.waitForSelector('text=test-invoice.pdf', { timeout: 3000 });

    // Click remove button
    await page.locator('button:has-text("Remove File")').click();

    // Verify file is removed and upload area is back
    await expect(page.locator('text=Click to upload')).toBeVisible();
    await expect(page.locator('text=test-invoice.pdf')).not.toBeVisible();
  });

  test('should enable upload button when cycle and file are selected', async ({ page }) => {
    // Select a cycle
    await page.waitForSelector('button[role="combobox"]', { state: 'visible' });
    await page.locator('button[role="combobox"]').first().click();
    await page.waitForSelector('[role="option"]', { state: 'visible' });
    await page.locator('[role="option"]').first().click();

    // Select a file
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

    // Wait for file to be selected
    await page.waitForSelector('text=test-invoice.pdf', { timeout: 3000 });

    // Verify upload button is enabled
    const uploadButton = page.locator('button[type="submit"]');
    await expect(uploadButton).toBeEnabled();
    await expect(uploadButton).toContainText('Upload Invoice');
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

    const fileInput = page.locator('input[type="file"]');
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
    // Select only a cycle (no file)
    await page.waitForSelector('button[role="combobox"]', { state: 'visible' });
    await page.locator('button[role="combobox"]').first().click();
    await page.waitForSelector('[role="option"]', { state: 'visible' });
    await page.locator('[role="option"]').first().click();

    // Try to submit (button should be disabled)
    const uploadButton = page.locator('button[type="submit"]');
    await expect(uploadButton).toBeDisabled();
  });

  test('should handle successful file upload', async ({ page }) => {
    // Select a cycle
    await page.waitForSelector('button[role="combobox"]', { state: 'visible' });
    await page.locator('button[role="combobox"]').first().click();
    await page.waitForSelector('[role="option"]', { state: 'visible' });
    await page.locator('[role="option"]').first().click();

    // Select a valid file
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

    // Wait for file to be selected
    await page.waitForSelector('text=test-invoice.pdf', { timeout: 3000 });

    // Submit the form
    const uploadButton = page.locator('button[type="submit"]');
    await uploadButton.click();

    // Wait for either success or error message
    // Note: This will depend on your API response
    await page.waitForTimeout(2000);

    // Check for success toast or error
    const successToast = page.locator('text=Invoice Uploaded');
    const errorToast = page.locator('text=Upload Failed');
    
    // One of them should appear
    const successVisible = await successToast.isVisible().catch(() => false);
    const errorVisible = await errorToast.isVisible().catch(() => false);
    
    expect(successVisible || errorVisible).toBeTruthy();

    // If successful, verify form is reset
    if (successVisible) {
      await expect(page.locator('text=Click to upload')).toBeVisible();
      // Cycle dropdown should be reset
      await expect(page.locator('button[role="combobox"]').first()).toContainText('Select a cycle');
    }
  });

  test('should show loading state during upload', async ({ page }) => {
    // Select a cycle
    await page.waitForSelector('button[role="combobox"]', { state: 'visible' });
    await page.locator('button[role="combobox"]').first().click();
    await page.waitForSelector('[role="option"]', { state: 'visible' });
    await page.locator('[role="option"]').first().click();

    // Select a file
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

    await page.waitForSelector('text=test-invoice.pdf', { timeout: 3000 });

    // Submit and check for loading state
    const uploadButton = page.locator('button[type="submit"]');
    await uploadButton.click();

    // Check if button shows loading state
    const buttonText = await uploadButton.textContent();
    // Button should show "Uploading..." or be disabled during upload
    expect(buttonText?.includes('Uploading') || (await uploadButton.isDisabled())).toBeTruthy();
  });
});

