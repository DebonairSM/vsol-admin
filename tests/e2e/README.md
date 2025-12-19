# E2E Tests

End-to-end tests for Company Portal using Playwright.

## Setup

1. Install dependencies:
```bash
pnpm install
```

2. Install Playwright browsers:
```bash
npx playwright install
```

## Running Tests

### Run all tests
```bash
pnpm test:e2e
```

### Run tests in UI mode (interactive)
```bash
pnpm test:e2e:ui
```

### Run tests in headed mode (see browser)
```bash
pnpm test:e2e:headed
```

### Debug tests
```bash
pnpm test:e2e:debug
```

## Test Configuration

Tests are configured to:
- Start the dev server automatically (`pnpm dev`)
- Use `http://localhost:5173` as the base URL
- Run in Chromium by default
- Retry failed tests 2 times in CI

## Test Credentials

The tests require a consultant user account. Set these environment variables:

### Windows PowerShell
```powershell
$env:TEST_CONSULTANT_USERNAME="your-consultant-username"
$env:TEST_CONSULTANT_PASSWORD="your-consultant-password"
```

### Windows CMD
```cmd
set TEST_CONSULTANT_USERNAME=your-consultant-username
set TEST_CONSULTANT_PASSWORD=your-consultant-password
```

### Unix/Linux/Mac (bash/zsh)
```bash
export TEST_CONSULTANT_USERNAME=your-consultant-username
export TEST_CONSULTANT_PASSWORD=your-consultant-password
```

Or create a consultant account using the admin interface and use those credentials.

**Note:** Environment variables set this way only last for the current PowerShell/terminal session. To make them persistent, you can:
- Add them to your PowerShell profile (`$PROFILE`)
- Use a `.env` file (requires additional setup)
- Set them in your system environment variables

## Authentication

The tests use Playwright's global setup to authenticate once before all tests run. This:
- Avoids rate limiting issues from multiple login attempts
- Speeds up test execution
- Stores authentication state in `tests/.auth/consultant-auth.json`

### Rate Limiting

If you see "Too many login attempts" errors:
1. Wait 15 minutes for the rate limit to reset
2. Delete `tests/.auth/consultant-auth.json` to force re-authentication
3. Run tests again

The global setup will authenticate once and reuse the session for all tests, avoiding rate limit issues during test execution.

## Test Files

- `consultant-invoices.spec.ts` - Tests for the consultant invoice upload page

## Test Fixtures

Test files are automatically created in `tests/fixtures/` when tests run. These include:
- `test-invoice.pdf` - Valid PDF file for testing
- `test-invoice.png` - Valid PNG file for testing
- `invalid-file.txt` - Invalid file type for validation testing
- `large-file.pdf` - File >10MB for size validation testing

