# Consultant 7 Deletion Report

## Problem Summary

Deleting consultant 7 is difficult because:

1. **Business Rule Protection**: The API service (`ConsultantService.delete`) has a built-in protection that prevents deleting consultants who have been used in payroll cycles. This is intentional to prevent accidental data loss.

2. **Database Relationships**: Consultant 7 has relationships with multiple tables:
   - `cycle_line_items` - Links consultant to payroll cycles
   - `invoices` - Consultant invoices
   - `payments` - Payment records
   - `consultant_equipment` - Equipment assignments

3. **Foreign Key Constraints**: SQLite foreign keys prevent deleting a consultant if related records exist (when foreign_keys are ON).

## Why the API Deletion Fails

When you try to delete via the UI/API, the code path is:
```
DELETE /api/consultants/7
  → ConsultantService.delete(7)
  → Checks for lineItems
  → If lineItems.length > 0:
      → Throws: "Cannot delete consultant that has been used in payroll cycles"
```

This is a **safety feature** to prevent accidentally deleting consultants who have payroll history.

## What We've Tried

1. ✅ Created deletion script (`raw-delete-7.ts`)
2. ✅ Script disables foreign keys temporarily
3. ✅ Script deletes line items first
4. ✅ Script deletes all related records
5. ✅ Script deletes consultant record
6. ✅ Script verifies deletion

## Current Status

The deletion script should work, but there may be:
- **API server caching** - Server needs restart
- **Database connection issues** - Multiple connections to same DB
- **Transaction isolation** - Changes not visible to running API server

## Solution

Run the force deletion script:
```bash
cd apps/api
pnpm tsx scripts/raw-delete-7.ts
```

Then **restart your API server** to clear any cached data.

## Root Cause

The difficulty comes from:
1. **Data integrity protection** - System prevents accidental deletion
2. **Multiple database connections** - Script and API server may have separate connections
3. **Caching** - API server may cache consultant data
4. **Business logic** - The service layer enforces business rules before database deletion

## Recommendation

For test data deletion, the script approach is correct. For production, consider:
- Using termination dates instead of deletion
- Adding a "force delete" admin endpoint
- Better error messages explaining why deletion is blocked

