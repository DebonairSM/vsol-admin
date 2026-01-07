# Test Consultant Creation and Testing Plan

This document outlines the plan for creating a test consultant to validate all consultant portal features, and then cleaning up the test data afterward.

## Overview

The consultant portal includes the following features that need testing:
1. **Portal Dashboard** (`/consultant`) - Overview with cycle count, vacation balance, calendar
2. **Invoice Upload** (`/consultant/invoices`) - Upload, view, download, and replace invoices
3. **My Profile** (`/consultant/profile`) - View and update personal information, change password
4. **My Equipment** (`/consultant/equipment`) - Add, edit, and manage equipment inventory
5. **My Vacations** (`/consultant/vacations`) - Create, view, and delete vacation days

## Phase 1: Create Test Consultant

### Step 1.1: Create Consultant Record

**Recommended: Use the enhanced test consultant portal script**
```bash
cd apps/api
tsx scripts/create-test-consultant-portal.ts
```

This script will:
- Create a consultant with all test fields populated
- Create a user account with known credentials
- Output login information for easy testing
- Handle existing consultant/user gracefully

**Alternative: Create via API** (as admin user)
```bash
POST /api/consultants
```

**Required fields:**
- `name`: "Test Consultant Portal" (unique name)
- `hourlyRate`: 25.00 (any reasonable rate)
- `email`: "test-consultant-portal@example.com" (required for user account creation)
- `startDate`: Current date (defaults to today if not provided)

**Optional but recommended fields for testing:**
- `phone`: "+55 11 99999-9999"
- `address`: "123 Test Street"
- `city`: "São Paulo"
- `state`: "SP"
- `cep`: "01234-567"
- `birthDate`: "1990-01-01"
- `shirtSize`: "M"
- `cpf`: "123.456.789-00" (test CPF)
- `payoneerID`: "TEST123456"

### Step 1.2: Create User Account

**Note:** The enhanced script (`create-test-consultant-portal.ts`) creates both the consultant and user account automatically. If you used the API to create the consultant, you can create the user account separately:

**Option A: Use existing script**
```bash
cd apps/api
tsx scripts/create-consultant-accounts.ts
```
(Select the test consultant when prompted)

**Account details (if creating manually):**
- `username`: "test-consultant-portal" (or auto-generated from name)
- `password`: "ChangeMe123!" (or set `mustChangePassword: false` for testing)
- `role`: "consultant"
- `consultantId`: [ID from Step 1.1]
- `mustChangePassword`: false (for easier testing, or true to test password change flow)

### Step 1.3: Verify Creation

1. Log in as admin and verify consultant appears in `/consultants` list
2. Log in as test consultant user and verify access to `/consultant` portal
3. Note the consultant ID for later cleanup

## Phase 2: Testing Checklist

### 2.1 Portal Dashboard (`/consultant`)

- [ ] Page loads without errors
- [ ] Welcome message displays consultant name
- [ ] "Upload Invoice" card is visible and link works
- [ ] "Available Cycles" card shows correct count (may be 0)
- [ ] "Profile" card is visible and link works
- [ ] "My Vacations" card shows vacation balance (if applicable)
- [ ] Calendar displays correctly
- [ ] Calendar shows vacation dates (if any exist)
- [ ] Calendar shows ceremony dates (if any exist)
- [ ] Calendar shows holiday dates (if any exist)
- [ ] Navigation sidebar works (Dashboard, Upload Invoice, My Profile, My Equipment, My Vacations)

### 2.2 Invoice Upload (`/consultant/invoices`)

**Prerequisites:** At least one payroll cycle must exist (create via admin if needed)

- [ ] Page loads without errors
- [ ] Cycle dropdown shows available cycles
- [ ] File upload area accepts PDF files
- [ ] File upload area accepts image files (JPEG, PNG)
- [ ] File size validation works (rejects >10MB)
- [ ] File type validation works (rejects invalid types)
- [ ] Upload succeeds with valid file
- [ ] Success toast appears after upload
- [ ] Uploaded invoice appears in "Uploaded Invoices" list
- [ ] "View" button opens invoice in new tab
- [ ] "Download" button downloads invoice file
- [ ] "Replace" button allows replacing existing invoice
- [ ] Replace functionality works correctly
- [ ] Error handling works for invalid uploads

### 2.3 My Profile (`/consultant/profile`)

**Personal Information:**
- [ ] Page loads without errors
- [ ] Name field is read-only (cannot be edited)
- [ ] Username field is read-only
- [ ] Email field can be edited
- [ ] Phone field can be edited
- [ ] Address fields can be edited (address, neighborhood, city, state, CEP)
- [ ] Birth date field can be edited
- [ ] Shirt size dropdown works
- [ ] Save button is disabled when no changes made
- [ ] Save button enables when changes are made
- [ ] Cancel button reverts changes
- [ ] Save succeeds and shows success toast
- [ ] Changes persist after page reload

**Emergency Contact:**
- [ ] Contact name field can be edited
- [ ] Relation field can be edited
- [ ] Contact phone field can be edited
- [ ] Changes save correctly

**Documents:**
- [ ] CPF field can be edited
- [ ] Changes save correctly

**Company Information:**
- [ ] Company legal name field can be edited
- [ ] Company trade name field can be edited
- [ ] CNPJ field can be edited
- [ ] Changes save correctly

**Payment Information:**
- [ ] Payoneer ID field can be edited
- [ ] Changes save correctly

**Change Password:**
- [ ] Current password field works
- [ ] New password field works
- [ ] Confirm password field works
- [ ] Password visibility toggles work
- [ ] Validation works (min 8 characters)
- [ ] Password mismatch error shows
- [ ] Same password error shows
- [ ] Password change succeeds
- [ ] Redirects to login after password change
- [ ] Can log in with new password

### 2.4 My Equipment (`/consultant/equipment`)

- [ ] Page loads without errors
- [ ] Empty state shows when no equipment
- [ ] "Add Equipment" button opens dialog
- [ ] Add dialog form validates required fields (device name)
- [ ] Can add equipment with required fields only
- [ ] Can add equipment with all fields filled
- [ ] Equipment appears in table after creation
- [ ] Edit button opens edit dialog
- [ ] Can update equipment details
- [ ] Changes persist after save
- [ ] Table displays all equipment fields correctly
- [ ] Date fields format correctly
- [ ] Return required checkbox works
- [ ] Notes field works

### 2.5 My Vacations (`/consultant/vacations`)

- [ ] Page loads without errors
- [ ] Vacation balance card displays (if applicable)
- [ ] Calendar displays correctly
- [ ] Calendar shows vacation dates
- [ ] Calendar shows ceremonies (if any)
- [ ] Calendar shows holidays (if any)
- [ ] "Add Day" button opens dialog
- [ ] Can create single vacation day
- [ ] Can add notes to vacation day
- [ ] Vacation day appears in calendar
- [ ] Vacation day appears in table
- [ ] "Add Range" button opens range dialog
- [ ] Can create vacation range (multiple days)
- [ ] All days in range appear in calendar
- [ ] All days in range appear in table
- [ ] Delete button removes vacation day
- [ ] Confirmation dialog appears before delete
- [ ] Filters work (start date, end date)
- [ ] Upcoming vacations section shows next 30 days
- [ ] Vacation balance updates correctly

## Phase 3: Cleanup

### Step 3.1: Delete Related Data

Before deleting the consultant, clean up any test data created:

**Equipment:**
- Delete all equipment records for the test consultant (via admin UI or API)
- Or they will be automatically deleted if using CASCADE (check schema)

**Vacations:**
- Delete all vacation days for the test consultant (via consultant portal or API)
- Or they will be automatically deleted if using CASCADE (check schema)

**Invoices:**
- Delete uploaded invoice files (if any)
- Invoice records may be linked to cycles, so may need to keep cycles or handle separately

**User Account:**
- Delete the user account first (to avoid foreign key issues)
```bash
# Via SQL or script
DELETE FROM users WHERE consultant_id = [consultant-id];
```

### Step 3.2: Delete Consultant

**Recommended: Use the enhanced cleanup script**
```bash
cd apps/api
tsx scripts/delete-test-consultant-portal.ts [consultant-id]
```

This script will automatically:
- Delete user account
- Delete equipment records
- Delete vacation days
- Delete invoices and uploaded files
- Delete consultant documents (CNH, address proof)
- Delete consultant record
- Provide a summary of what was deleted

**Alternative: Use existing script** (manual cleanup required)
```bash
cd apps/api
tsx scripts/delete-consultant.ts [consultant-id]
```

**Alternative: Via API** (as admin, manual cleanup required)
```bash
DELETE /api/consultants/[consultant-id]
```

**Important Notes:**
- Scripts will fail if consultant has been used in payroll cycles (has line items)
- For test consultant, ensure no cycles were created that include this consultant
- If cycles exist, either:
  - Delete the cycles first (if they are test cycles)
  - Or set `terminationDate` instead of deleting (soft delete)

### Step 3.3: Verify Cleanup

1. Verify consultant no longer appears in `/consultants` list
2. Verify user account no longer exists
3. Verify equipment records are deleted
4. Verify vacation records are deleted
5. Verify uploaded invoice files are deleted (check `apps/api/uploads/` directory)
6. Check for any orphaned audit log entries (optional cleanup)

## Scripts Available

### Enhanced Test Consultant Creation Script

**Location:** `apps/api/scripts/create-test-consultant-portal.ts`

This script:
1. Creates consultant with all test fields populated
2. Creates user account with known credentials
3. Outputs login credentials for easy testing
4. Handles existing consultant/user gracefully

**Usage:**
```bash
cd apps/api
tsx scripts/create-test-consultant-portal.ts
```

### Enhanced Test Consultant Cleanup Script

**Location:** `apps/api/scripts/delete-test-consultant-portal.ts`

This script:
1. Takes consultant ID as argument
2. Deletes all related data (equipment, vacations, invoices, files)
3. Deletes user account
4. Deletes consultant
5. Provides detailed output of what was deleted

**Usage:**
```bash
cd apps/api
tsx scripts/delete-test-consultant-portal.ts [consultant-id]
```

## Testing Notes

- Use a unique consultant name to avoid conflicts: "Test Consultant Portal [YYYY-MM-DD]"
- Keep consultant ID noted for easy cleanup
- Test with at least one payroll cycle available for invoice upload testing
- Test password change flow early (may require re-login)
- Test all CRUD operations (Create, Read, Update, Delete) for equipment and vacations
- Verify calendar integration works with all event types
- Test error cases (invalid file uploads, validation errors, etc.)

## Rollback Plan

If something goes wrong during testing:
1. Note what data was created
2. Use cleanup script to remove test consultant
3. Manually clean up any orphaned data if needed
4. Verify database integrity

## Future Enhancements

Consider creating:
- Automated test suite for consultant portal (E2E tests)
- Test data seeding script for consistent test environment
- Test consultant template with all fields pre-populated
- Integration with CI/CD for automated portal testing
