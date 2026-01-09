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

The tests require both consultant and admin user accounts. Set these environment variables:

### Windows PowerShell
```powershell
# Consultant credentials (for consultant portal tests)
$env:TEST_CONSULTANT_USERNAME="your-consultant-username"
$env:TEST_CONSULTANT_PASSWORD="your-consultant-password"

# Admin credentials (for admin tests)
$env:TEST_ADMIN_USERNAME="your-admin-username"
$env:TEST_ADMIN_PASSWORD="your-admin-password"
```

### Windows CMD
```cmd
set TEST_CONSULTANT_USERNAME=your-consultant-username
set TEST_CONSULTANT_PASSWORD=your-consultant-password
set TEST_ADMIN_USERNAME=your-admin-username
set TEST_ADMIN_PASSWORD=your-admin-password
```

### Unix/Linux/Mac (bash/zsh)
```bash
export TEST_CONSULTANT_USERNAME=your-consultant-username
export TEST_CONSULTANT_PASSWORD=your-consultant-password
export TEST_ADMIN_USERNAME=your-admin-username
export TEST_ADMIN_PASSWORD=your-admin-password
```

**Default credentials** (if not set):
- Consultant: `test-consultant-portal` / `ChangeMe123!`
- Admin: `e2e-admin` / `admin123`

The default test users are automatically created during global setup if they don't exist.

**Note:** Environment variables set this way only last for the current PowerShell/terminal session. To make them persistent, you can:
- Add them to your PowerShell profile (`$PROFILE`)
- Use a `.env` file (requires additional setup)
- Set them in your system environment variables

## Authentication

The tests use Playwright's global setup to authenticate once before all tests run. This:
- Avoids rate limiting issues from multiple login attempts
- Speeds up test execution
- Stores authentication state in `tests/.auth/consultant-auth.json` and `tests/.auth/admin-auth.json`

The global setup authenticates both consultant and admin users separately:
- Consultant auth state: `tests/.auth/consultant-auth.json`
- Admin auth state: `tests/.auth/admin-auth.json`

### Test Projects

Tests are organized into projects in `playwright.config.ts`:
- **consultant** project: Runs consultant portal tests with consultant auth state
- **admin** project: Runs admin tests with admin auth state
- **chromium** project: Default project for tests not matching specific patterns

### Rate Limiting

If you see "Too many login attempts" errors:
1. Wait 15 minutes for the rate limit to reset
2. Delete `tests/.auth/consultant-auth.json` or `tests/.auth/admin-auth.json` to force re-authentication
3. Run tests again

The global setup will authenticate once and reuse the session for all tests, avoiding rate limit issues during test execution.

## Test Files

### Consultant Tests
- `consultant-portal.spec.ts` - Tests for the consultant portal dashboard page
- `consultant-portal-capabilities.spec.ts` - Tests for consultant portal capabilities (invoice upload, profile updates, equipment, vacations)
- `consultant-invoices.spec.ts` - Tests for the consultant invoice upload page

### Admin Tests
- `auth-login.spec.ts` - Tests for authentication and login flows (admin and consultant)
- `admin-dashboard.spec.ts` - Tests for admin dashboard page
- `admin-cycles-create.spec.ts` - Tests for creating new payroll cycles
- `admin-golden-sheet.spec.ts` - Tests for Golden Sheet page (cycle editing, calculations)
- `admin-consultants-list.spec.ts` - Tests for consultants list page
- `admin-consultants-crud.spec.ts` - Tests for consultant CRUD operations
- `admin-equipment.spec.ts` - Tests for equipment management page
- `admin-invoices.spec.ts` - Tests for client invoices page
- `admin-payments.spec.ts` - Tests for payments page
- `admin-work-hours.spec.ts` - Tests for work hours page
- `admin-vacations.spec.ts` - Tests for admin vacations page
- `admin-audit.spec.ts` - Tests for audit log page
- `admin-settings.spec.ts` - Tests for settings page
- `admin-users.spec.ts` - Tests for user management page (admin only)
- `admin-integration.spec.ts` - Integration tests for full workflows

## Test Fixtures

Test files are automatically created in `tests/fixtures/` when tests run. These include:
- `test-invoice.pdf` - Valid PDF file for testing
- `test-invoice.png` - Valid PNG file for testing
- `invalid-file.txt` - Invalid file type for validation testing
- `large-file.pdf` - File >10MB for size validation testing

