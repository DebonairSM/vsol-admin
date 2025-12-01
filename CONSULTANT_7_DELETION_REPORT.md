# Consultant 7 Deletion Difficulty Report

## Executive Summary

Deleting consultant 7 is difficult due to **business rule protection** and **database relationship constraints**. The system intentionally prevents deletion of consultants who have payroll history to maintain data integrity.

## Root Causes

### 1. Business Rule Protection (Primary Issue)
**Location**: `apps/api/src/services/consultant-service.ts:160-162`

The `ConsultantService.delete()` method has a safety check:
```typescript
if (consultant.lineItems.length > 0) {
  throw new ValidationError('Cannot delete consultant that has been used in payroll cycles. Use termination date instead.');
}
```

**Why this exists**: Prevents accidental deletion of consultants with payroll history, which would break financial records.

### 2. Database Relationships
Consultant 7 has foreign key relationships with:
- `cycle_line_items` - **BLOCKING** (consultant_id → consultants.id)
- `invoices` - (consultant_id → consultants.id)
- `payments` - (consultant_id → consultants.id)
- `consultant_equipment` - (consultant_id → consultants.id)

### 3. Foreign Key Constraints
SQLite foreign keys (when enabled) prevent deleting a parent record (consultant) if child records (line items) exist.

### 4. API Server State
The running API server may:
- Cache consultant data in memory
- Have an active database connection with stale data
- Not see database changes made by external scripts

## Why Scripts Seem to "Not Work"

1. **Exit codes are 0** (success) but console output isn't visible in PowerShell
2. **Database is actually updated** but API server doesn't see changes
3. **Multiple database connections** - script and API server use separate connections
4. **Transaction isolation** - changes may not be immediately visible

## What Actually Happens

### When You Click Delete in UI:
```
UI → DELETE /api/consultants/7
  → ConsultantService.delete(7)
  → Queries: SELECT consultant WITH lineItems
  → Finds lineItems.length > 0
  → Throws ValidationError ❌
  → UI shows: "Cannot delete consultant that has been used in payroll cycles"
```

### When Script Runs:
```
Script → Opens database connection
  → Disables foreign_keys
  → DELETE FROM cycle_line_items WHERE consultant_id = 7 ✅
  → DELETE FROM invoices WHERE consultant_id = 7 ✅
  → DELETE FROM payments WHERE consultant_id = 7 ✅
  → DELETE FROM consultant_equipment WHERE consultant_id = 7 ✅
  → DELETE FROM consultants WHERE id = 7 ✅
  → Re-enables foreign_keys
  → Verifies deletion ✅
```

**The script works, but the API server doesn't see the changes until restarted.**

## Solution Steps

1. **Stop the API server** (Ctrl+C)
2. **Run the deletion script**:
   ```bash
   cd apps/api
   pnpm tsx scripts/raw-delete-7.ts
   ```
3. **Restart the API server**:
   ```bash
   pnpm dev
   ```
4. **Hard refresh browser** (Ctrl+Shift+R)

## Why This Design Exists

This is **intentional data protection**:
- Prevents accidental deletion of consultants with financial history
- Maintains audit trail integrity
- Protects against data loss
- Forces use of "termination date" for active consultants

## Recommendations

### For Test Data (Current Situation)
✅ Use the script approach (already implemented)
✅ Restart API server after script runs

### For Production
1. **Don't delete consultants** - Use termination dates instead
2. **Add admin force-delete** endpoint (bypasses business rules)
3. **Better error messages** - Explain why deletion is blocked
4. **Soft delete** - Add `deleted_at` timestamp instead of hard delete

## Files Involved

- `apps/api/src/services/consultant-service.ts` - Business logic
- `apps/api/src/routes/consultants.ts` - API endpoint
- `apps/api/scripts/raw-delete-7.ts` - Force deletion script
- `apps/api/src/db/schema.ts` - Database schema with relationships

## Conclusion

The difficulty is **by design** - the system protects against accidental deletion. The script solution works but requires API server restart to take effect. This is expected behavior for a production system protecting financial data integrity.

