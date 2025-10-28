<!-- 9bfd4913-ccec-4c2e-92e0-eca0528f60fa 7a68e493-9d17-457a-8f21-b6727cb87438 -->
# Architectural Code Smell Analysis

## Executive Summary

The codebase demonstrates strong foundational architecture with clear layer separation. However, several architectural inconsistencies and mixed concerns exist that reduce maintainability and consistency.

**Overall Health: 7/10**

- Strong service layer abstraction
- Clean React hooks pattern
- Well-isolated API client
- Issues: Inconsistent patterns, some mixed concerns, duplicated business logic

---

## 1. SEPARATION OF CONCERNS VIOLATIONS

### Backend Issues

#### 1.1 File Upload Configuration in Route Handler

**File:** `apps/api/src/routes/consultants.ts`

**Lines:** 22-35

```typescript
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => { /* validation logic */ }
});
```

**Problem:** Multer configuration is defined inline in the route file. This is infrastructure logic that should be middleware.

**Layer:** Route handler contains infrastructure configuration

**Refactoring:** Extract to `apps/api/src/middleware/upload.ts` as reusable middleware

---

#### 1.2 Business Validation in Route Handlers

**File:** `apps/api/src/routes/consultants.ts`

**Lines:** 120-126, 298-304

```typescript
if (!['cnh', 'address_proof'].includes(documentType)) {
  return res.status(400).json({ error: 'Invalid document type...' });
}

const { canGenerate, reasons } = await TerminationService.canGenerateDocument(consultantId);
if (!canGenerate) {
  return res.status(400).json({ error: 'Cannot generate...', reasons });
}
```

**Problem:** Business validation logic exists in route handlers rather than service layer. Routes should only orchestrate, not validate business rules.

**Layer:** Route handler performing business validation

**Refactoring:** Move document type validation to DocumentService, move canGenerate check into service method

---

#### 1.3 Inconsistent Audit Logging Pattern

**File:** `apps/api/src/routes/bonus.ts`

**Lines:** 27-32, 48-54

```typescript
await createAuditLog(req.user!.userId, {
  action: 'CREATE_BONUS_WORKFLOW',
  entityType: 'BONUS_WORKFLOW',
  entityId: workflow.id,
  changes: { cycleId: workflow.cycleId }
});
```

**Problem:** Direct `createAuditLog()` calls in route handler instead of using `auditMiddleware()` like other routes. This creates inconsistent patterns.

**Layer:** Route handler with side-effect logging

**Refactoring:** Use `auditMiddleware()` consistently across all mutation routes

**Comparison with consistent pattern:**

```typescript
// Other routes (cycles.ts, consultants.ts)
router.post('/', 
  validateBody(schema),
  auditMiddleware('CREATE_CYCLE', 'cycle'),  // ✓ Middleware pattern
  async (req, res, next) => { /* handler */ }
);
```

---

#### 1.4 HTTP Response Logic in Services

**File:** `apps/api/src/services/bonus-workflow-service.ts`

**Lines:** 138-140

```typescript
if (consultantsWithBonuses.length === 0) {
  throw new ValidationError('No bonus amounts configured...');
}
```

**Problem:** Service throws user-facing error messages. Services should return data or domain errors, not HTTP-specific messages.

**Layer:** Service with presentation-layer concerns

**Refactoring:** Return structured result objects, let route handlers format responses

---

### Frontend Issues

#### 1.5 Business Logic Calculation in Component

**File:** `apps/web/src/routes/golden-sheet.tsx`

**Lines:** 79-85

```typescript
const calculateSubtotal = (line: any) => {
  const workHours = line.workHours || cycle.globalWorkHours || 0;
  const rateAmount = workHours * line.ratePerHour;
  const adjustment = line.adjustmentValue || 0;
  const advance = line.bonusAdvance || 0;
  return rateAmount + adjustment - advance;
};
```

**Problem:** Business calculation logic is defined in component. This duplicates server-side calculation in `CycleService.calculateLineItemSubtotal()` and violates DRY.

**Layer:** Component with business logic

**Refactoring:** Extract to `apps/web/src/lib/calculations.ts` utility module, or include subtotal in API response

---

#### 1.6 File Download Logic in Component

**File:** `apps/web/src/routes/consultants.tsx`

**Lines:** 17-50

```typescript
const handleGenerateContract = async (consultant: any) => {
  // ... 30+ lines of file download logic
  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  // ... DOM manipulation for download
};
```

**Problem:** HTTP response processing and DOM manipulation mixed in component. This is API client responsibility.

**Layer:** Component with HTTP/DOM concerns

**Refactoring:** Move to `apiClient.downloadConsultantContract()` method that handles blob processing

---

#### 1.7 Business Validation in Component

**File:** `apps/web/src/routes/consultants.tsx`

**Lines:** 52-55

```typescript
const canGenerateContract = (consultant: any) => 
  consultant.name?.trim() && 
  consultant.companyLegalName?.trim() && 
  consultant.cnpj?.trim();
```

**Problem:** Business validation rules in component. This duplicates backend validation and can become inconsistent.

**Layer:** Component with validation logic

**Refactoring:** Backend should return `canGenerateContract` flag, or move to shared schema validation

---

## 2. ARCHITECTURAL CONSISTENCY ISSUES

### 2.1 Mixed Audit Patterns

**Inconsistency:** Three different audit patterns exist:

1. **Middleware pattern (preferred):**

   - `apps/api/src/routes/cycles.ts` - uses `auditMiddleware()`
   - `apps/api/src/routes/consultants.ts` - uses `auditMiddleware()`
   - `apps/api/src/routes/payments.ts` - uses `auditMiddleware()`

2. **Direct call pattern (inconsistent):**

   - `apps/api/src/routes/bonus.ts` - calls `createAuditLog()` directly

**Impact:** Developers need to remember different patterns. Future routes may use wrong pattern.

**Recommendation:** Standardize on `auditMiddleware()` for all mutations

---

### 2.2 Service Method Naming Inconsistency

**Pattern 1 (most common):**

```typescript
CycleService.getAll()
CycleService.getById()
CycleService.create()
CycleService.update()
```

**Pattern 2 (variant):**

```typescript
BonusWorkflowService.getByCycleId()  // Different getter pattern
EquipmentService.getByConsultantId()
```

**Issue:** Mixed naming for "get by related entity" methods. Some use `getByCycleId`, others might use `getAllByCycle`.

**Recommendation:** Standardize as `getBy<Relation>()` pattern

---

### 2.3 Date Handling Inconsistency

**Pattern 1 (ISO string in API):**

```typescript
// golden-sheet.tsx line 59
value = editValue ? new Date(editValue).toISOString() : null;
```

**Pattern 2 (Date object conversion in service):**

```typescript
// consultant-service.ts line 98
updateData.terminationDate = data.terminationDate ? new Date(data.terminationDate) : null;
```

**Issue:** Date conversion happens at different layers. Sometimes frontend sends ISO, sometimes backend parses.

**Recommendation:** Always accept ISO strings at API boundary, convert in service layer

---

## 3. LAYER MIXING ANTIPATTERNS

### Summary Table

| File | Layer | Mixed Concern | Lines |

|------|-------|---------------|-------|

| `consultants.ts` (route) | Route | Infrastructure config (multer) | 22-35 |

| `consultants.ts` (route) | Route | Business validation | 120-126, 298-304 |

| `bonus.ts` (route) | Route | Side-effect logging | 27-32 |

| `golden-sheet.tsx` | Component | Business calculation | 79-85 |

| `consultants.tsx` | Component | HTTP response handling | 17-50 |

| `consultants.tsx` | Component | Business validation | 52-55 |

| `bonus-workflow-service.ts` | Service | User-facing error messages | 138-140 |

---

## 4. DEPENDENCY FLOW ANALYSIS

### Good Patterns ✓

**Backend:**

```
Routes → Services → Database (Drizzle)
```

Example: `cycles.ts` → `CycleService` → `db.query.payrollCycles`

**Frontend:**

```
Components → Hooks → API Client → Backend
```

Example: `golden-sheet.tsx` → `useCycle()` → `apiClient.getCycle()` → API

**Middleware Chain:**

```
authenticateToken → validateBody → auditMiddleware → route handler
```

### Issues Identified

#### 4.1 Audit Middleware Response Interception

**File:** `apps/api/src/middleware/audit.ts`

**Lines:** 26-44

```typescript
res.send = function(data) {
  if (res.statusCode >= 200 && res.statusCode < 300 && req.user) {
    createAuditLog(req.user.userId, { /* ... */ }).catch(console.error);
  }
  return originalSend.call(this, data);
};
```

**Problem:** Middleware intercepts `res.send()` to create side effect. This creates implicit coupling and makes testing harder.

**Better approach:** Use Express post-response middleware or event emitter pattern

---

#### 4.2 Circular Import Risk

**Files:**

- `apps/api/src/services/cycle-service.ts` imports `CycleService`
- Routes import both service and middleware
- Middleware imports database directly

**Current status:** No actual circular dependencies detected

**Risk:** Future changes could create cycles if services import middleware or routes

**Recommendation:** Maintain strict layer hierarchy:

```
Routes → Services → Data Layer
         ↓
    Middleware (shared)
```

---

## 5. REACT-SPECIFIC PATTERNS

### 5.1 Duplicated Business Logic

**Server:** `apps/api/src/services/cycle-service.ts:197-203`

```typescript
static calculateLineItemSubtotal(lineItem: any, globalWorkHours: number): number {
  const workHours = lineItem.workHours || globalWorkHours;
  const rateAmount = workHours * lineItem.ratePerHour;
  const adjustment = lineItem.adjustmentValue || 0;
  const advance = lineItem.bonusAdvance || 0;
  return rateAmount + adjustment - advance;
}
```

**Client:** `apps/web/src/routes/golden-sheet.tsx:79-85`

```typescript
const calculateSubtotal = (line: any) => {
  const workHours = line.workHours || cycle.globalWorkHours || 0;
  const rateAmount = workHours * line.ratePerHour;
  const adjustment = line.adjustmentValue || 0;
  const advance = line.bonusAdvance || 0;
  return rateAmount + adjustment - advance;
};
```

**Problem:** Same calculation in two places. If formula changes, must update both.

**Solution:**

1. Include `subtotal` in API response from `getCycle` endpoint
2. OR: Extract to shared package calculation utility

---

### 5.2 Direct API Error Handling in Components

**File:** `apps/web/src/components/bonus-workflow-section.tsx`

**Lines:** 52-54

```typescript
const errorMessage = error?.response?.data?.message || error?.message || 'Failed to generate...';
toast.error(errorMessage);
```

**Problem:** Component reaches into error response structure. This couples component to API error format.

**Solution:** API client should normalize error responses, return consistent error objects

---

### 5.3 Local State for Server Data

**File:** `apps/web/src/components/bonus-workflow-section.tsx`

**Lines:** 26-35

```typescript
const [announcementDate, setAnnouncementDate] = useState<Date | undefined>(
  workflow?.bonusAnnouncementDate ? new Date(workflow.bonusAnnouncementDate) : undefined
);
// ... similar for other fields
```

**Problem:** Local state mirrors server state. This creates "stale data" risk if workflow refetches.

**Better pattern:** Use form library (React Hook Form) or keep single source of truth in React Query cache

---

## 6. NODE.JS/EXPRESS PATTERNS

### 6.1 Middleware Organization

**Current structure:**

```
apps/api/src/middleware/
  auth.ts         - Authentication
  validate.ts     - Zod validation
  audit.ts        - Audit logging
  errors.ts       - Error classes
```

**Missing:**

- `upload.ts` - File upload middleware (currently inline in consultants.ts)
- `rate-limit.ts` - Rate limiting (if needed)
- `error-handler.ts` - Centralized error handling middleware

---

### 6.2 Route Organization

**Good pattern:** Routes organized by entity (cycles, consultants, bonus, etc.)

**Inconsistency:**

- Some routes mix concerns: `consultants.ts` handles consultants, equipment, terminations, and documents (326 lines)
- Could be split: `consultant-routes.ts`, `equipment-routes.ts`, `termination-routes.ts`

---

### 6.3 Error Handling Consistency

**Pattern 1 (most routes):**

```typescript
try {
  const result = await Service.method();
  res.json(result);
} catch (error) {
  next(error);
}
```

**Pattern 2 (consultants.ts document routes):**

```typescript
if (!filePath) {
  return res.status(404).json({ error: 'Document not found' });
}
```

**Issue:** Mixed error handling. Some use `next(error)`, others return directly.

**Recommendation:** Always use `next(error)` for consistency, let error middleware format responses

---

## 7. POSITIVE PATTERNS TO PRESERVE

### ✓ Thin Route Handlers

Most routes correctly delegate to services:

```typescript
router.get('/', async (req, res, next) => {
  try {
    const cycles = await CycleService.getAll();
    res.json(cycles);
  } catch (error) {
    next(error);
  }
});
```

### ✓ Service Layer Abstraction

Services contain business logic and data access:

```typescript
export class CycleService {
  static async create(data: CreateCycleRequest) {
    // Validation, transaction, business logic
  }
}
```

### ✓ React Hooks for Data Fetching

Clean separation of data fetching from components:

```typescript
export function useCycle(id: number) {
  return useQuery({
    queryKey: ['cycles', id],
    queryFn: () => apiClient.getCycle(id),
  });
}
```

### ✓ Isolated API Client

API communication well-abstracted:

```typescript
class ApiClient {
  private async request<T>(endpoint: string, options: RequestInit): Promise<T> {
    // Centralized error handling, auth headers
  }
}
```

### ✓ Zod Validation Schemas

Input validation centralized in shared package:

```typescript
export const createCycleSchema = z.object({
  monthLabel: z.string(),
  globalWorkHours: z.number().optional(),
});
```

---

## 8. REFACTORING PRIORITIES

### High Priority (P0)

1. **Standardize audit logging** - Use `auditMiddleware()` everywhere
2. **Extract business calculations** - Move subtotal calculation to shared location
3. **Move file upload config** - Extract multer to middleware

### Medium Priority (P1)

4. **Normalize error handling** - Consistent `next(error)` usage
5. **Extract file download logic** - Move to API client
6. **Split large route files** - Break up consultants.ts

### Low Priority (P2)

7. **Standardize date handling** - Consistent ISO string boundary
8. **Add form state management** - Use React Hook Form for bonus workflow
9. **Service method naming** - Consistent `getBy<Relation>()` pattern

---

## 9. SPECIFIC REFACTORING EXAMPLES

### Example 1: Extract Upload Middleware

**Create:** `apps/api/src/middleware/upload.ts`

```typescript
export const uploadConsultantDocument = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png'];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only JPEG and PNG files are allowed'));
    }
  },
});
```

**Update:** `apps/api/src/routes/consultants.ts`

```typescript
import { uploadConsultantDocument } from '../middleware/upload';

router.post('/:id/documents/:type',
  uploadConsultantDocument.single('document'),
  auditMiddleware('UPLOAD_DOCUMENT', 'consultant'),
  async (req, res, next) => { /* handler */ }
);
```

---

### Example 2: Include Subtotal in API Response

**Update:** `apps/api/src/services/cycle-service.ts`

```typescript
static async getById(id: number) {
  const cycle = await db.query.payrollCycles.findFirst({
    where: eq(payrollCycles.id, id),
    with: { lines: { with: { consultant: true } } }
  });
  
  // Add computed subtotals to line items
  const linesWithSubtotals = cycle.lines.map(line => ({
    ...line,
    subtotal: this.calculateLineItemSubtotal(line, cycle.globalWorkHours || 0)
  }));
  
  return { ...cycle, lines: linesWithSubtotals };
}
```

**Update:** `apps/web/src/routes/golden-sheet.tsx`

```typescript
// Remove calculateSubtotal function
// Use line.subtotal directly from API
<TableCell className="font-mono font-bold">
  {formatCurrency(line.subtotal)}
</TableCell>
```

---

### Example 3: Consistent Audit Middleware

**Update:** `apps/api/src/routes/bonus.ts`

```typescript
// Before:
router.post('/cycles/:cycleId/bonus', authenticateToken, async (req, res, next) => {
  await createAuditLog(req.user!.userId, { /* ... */ });
  // ...
});

// After:
router.post('/cycles/:cycleId/bonus', 
  authenticateToken,
  auditMiddleware('CREATE_BONUS_WORKFLOW', 'BONUS_WORKFLOW'),
  async (req, res, next) => {
    // No manual audit logging
  }
);
```

---

## 10. METRICS & MEASUREMENTS

### Current Layer Violations Count

| Category | Count | Severity |

|----------|-------|----------|

| Business logic in routes | 4 | High |

| Business logic in components | 3 | High |

| Infrastructure in routes | 1 | Medium |

| Inconsistent patterns | 3 | Medium |

| Missing abstractions | 2 | Low |

### Files Requiring Attention

| File | Issues | Complexity |

|------|--------|------------|

| `consultants.ts` (route) | 4 | High |

| `golden-sheet.tsx` | 2 | Medium |

| `consultants.tsx` | 3 | Medium |

| `bonus.ts` (route) | 1 | Low |

| `audit.ts` (middleware) | 1 | Low |

---

## CONCLUSION

The codebase has a solid architectural foundation with clear layers. The primary issues are:

1. **Consistency gaps** - Mixed patterns for audit logging, error handling, and validation
2. **Business logic leakage** - Some calculations and validations in wrong layers
3. **Missing abstractions** - File upload, error normalization need middleware/utilities

**Recommended approach:**

1. Start with P0 items (audit standardization, calculation extraction)
2. Gradually refactor P1 items during feature work
3. Document patterns in ADR (Architecture Decision Records)

The violations are not severe architectural flaws, but rather opportunities to improve maintainability and developer experience.