<!-- 88302453-3d01-4246-b9d2-d1070c81f624 7a861881-f336-4648-b9bd-505478b3da65 -->
# VSol Admin – Golden Sheet MVP

## Overview

Build a local-first, SQLite-backed application that replaces the Excel-based "golden sheet" for managing monthly consultant payroll cycles. The system will automate calculations, provide audit logging, and maintain data integrity while preserving the familiar workflow.

## Tech Stack

- **Monorepo**: Turborepo + pnpm workspaces
- **Backend**: Node.js + Express, Drizzle ORM (SQLite), Zod validation
- **Frontend**: React + Vite, React Router v6, TanStack Query, TanStack Table, Shadcn/ui, date-fns
- **Database**: SQLite (`file:./dev.db`)
- **Auth**: Simple JWT with username/password for audit trail (users: rommel, isabel, celiane)

## Project Structure

```
vsol-admin/
├── apps/
│   ├── api/                    # Express API server
│   │   ├── src/
│   │   │   ├── server.ts
│   │   │   ├── routes/
│   │   │   ├── services/       # Business logic & calculations
│   │   │   ├── middleware/     # Auth, error handling
│   │   │   ├── db/             # Drizzle schema & client
│   │   │   │   ├── schema.ts   # Drizzle table definitions
│   │   │   │   ├── index.ts    # DB client export
│   │   │   │   └── seed.ts     # Seed from golden sheet data
│   │   │   └── lib/            # Utils
│   │   ├── drizzle/            # Drizzle migrations
│   │   ├── scripts/
│   │   │   └── backup-db.js
│   │   ├── drizzle.config.ts
│   │   ├── .env
│   │   └── package.json
│   └── web/                    # React SPA
│       ├── src/
│       │   ├── main.tsx
│       │   ├── App.tsx
│       │   ├── routes/         # Page components
│       │   ├── components/     # UI components
│       │   ├── lib/            # API client, utils
│       │   └── hooks/          # React Query hooks
│       └── package.json
├── packages/
│   └── shared/                 # Shared types, Zod schemas
│       └── src/
│           ├── types.ts
│           └── schemas.ts
├── turbo.json
├── package.json                # Root workspace
└── pnpm-workspace.yaml
```

## Database Schema

### Prisma Models

**User** (for audit trail)

- id, username (unique), passwordHash, role, createdAt

**Consultant** (from Staff Information sheet)

- id, name (unique), hourlyRate, startDate, terminationDate (nullable), evaluationNotes, isActive (computed: terminationDate is null), createdAt, updatedAt
- Relations: lineItems[], invoices[], payments[]
- Note: Only active consultants (no termination date) are auto-included when creating new cycles

**PayrollCycle** (golden sheet header + footer)

- id, monthLabel (e.g., "2025-10"), createdAt, updatedAt
- **Header dates**: calculatedPaymentDate, paymentArrivalDate, sendReceiptDate, sendInvoiceDate, invoiceApprovalDate, hoursLimitChangedOn, additionalPaidOn
- **Footer values**: totalHourlyValue (computed), globalWorkHours (e.g., 184), omnigoBonus (e.g., 3111.00), pagamentoPIX, pagamentoInter, equipmentsUSD, usdTotal (computed)
- Relations: lines[], invoices[], payments[], auditLogs[]

**CycleLineItem** (golden sheet row per consultant)

- id, cycleId, consultantId, createdAt, updatedAt
- invoiceSent (boolean), adjustmentValue, bonusDate, informedDate, bonusPaydate, ratePerHour (snapshot), bonusAdvance, advanceDate, workHours (override), comments
- Relations: cycle, consultant

**Invoice** (explicit tracking)

- id, cycleId, consultantId, hours, rate, amount, sent, approved, sentDate, approvedDate

**Payment** (explicit tracking)

- id, cycleId, consultantId (nullable), kind (enum: REGULAR, BONUS, ADVANCE, ADJUSTMENT), amount, date

**AuditLog** (track all state changes)

- id, userId, cycleId (nullable), action, entityType, entityId, changes (JSON), timestamp

### Computed Fields (not stored)

- `lineItem.subtotal = (workHours || cycle.globalWorkHours) * ratePerHour + (adjustmentValue || 0) - (bonusAdvance || 0)`
- `cycle.totalHourlyValue = SUM(line.ratePerHour)` for all lines in cycle
- `cycle.usdTotal = (totalHourlyValue * globalWorkHours) - (pagamentoPIX + pagamentoInter) + omnigoBonus + equipmentsUSD`

Formula matches Excel B28: `=B22*B26-(B23+B24)+B25+B27`

## API Endpoints

Base: `http://localhost:3000/api`

### Auth

- `POST /auth/login` → { username, password } → JWT token
- `GET /auth/me` → current user info

### Consultants

- `GET /consultants` → list all
- `POST /consultants` → create (requires: name, hourlyRate)
- `PUT /consultants/:id` → update
- `DELETE /consultants/:id` → soft delete (check if used in cycles)

### Cycles

- `GET /cycles` → list all (sort by monthLabel desc)
- `POST /cycles` → create cycle + auto-populate line items with current consultant rates
  - Body: { monthLabel, globalWorkHours, omnigoBonus? }
- `GET /cycles/:id` → full cycle with lines[], invoices[], payments[]
- `PUT /cycles/:id` → update header/footer dates and values
- `GET /cycles/:id/summary` → computed totals, KPIs, anomalies

### Cycle Line Items

- `GET /cycles/:id/lines` → all lines for cycle
- `PUT /cycles/:id/lines/:lineId` → update line item (triggers recompute)

### Invoices

- `GET /invoices?cycleId=X` → list
- `POST /invoices` → create
- `PUT /invoices/:id` → update

### Payments

- `GET /payments?cycleId=X` → list
- `POST /payments` → record
- `DELETE /payments/:id` → remove

### Audit

- `GET /audit?cycleId=X&userId=Y` → audit log entries

All mutations create audit log entries with userId, action, entityType, entityId, changes (JSON diff).

## Frontend Routes

- `/login` → auth page
- `/dashboard` → month selector, KPI cards (USD Total, Total Hourly Value, Omnigo Bonus), status checklist
- `/cycles/:id` → **Golden Sheet page** (main grid + footer cards)
- `/consultants` → consultant directory, CRUD
- `/invoices` → invoice tracking (lightweight)
- `/payments` → payment tracking (lightweight)
- `/audit` → audit log viewer

### Golden Sheet Page (`/cycles/:id`)

**Layout**: Header with cycle info → Main grid (TanStack Table) → Footer cards with totals

**Grid columns**:

1. Contractor Name (read-only)
2. Invoice Sent (checkbox)
3. Adjustment Value (editable number input)
4. Comments (editable text)
5. Bonus Date (date picker)
6. Informed Person (date picker)
7. On Bonus Paydate (date picker)
8. Rate per Hour (read-only, snapshotted)
9. Bonus Advance (editable number)
10. Advance Date (date picker)
11. **Subtotal** (computed, read-only, formatted as currency)

**Inline editing**: Click cell → edit → blur or Enter to save → optimistic update via React Query

**Footer section** (below grid):

- Editable cards: Global Work Hours, Omnigo Bonus, Pagamento PIX, Pagamento Inter, Equipments USD
- Computed displays: Total Hourly Value, USD Total (with formula breakdown tooltip)
- Header dates section: 7 date fields from cycle (calculatedPaymentDate, paymentArrivalDate, etc.)

**Anomaly badges**: Missing invoice dates, bonus advance without paydate, zero rate, etc.

## Seed Data

Based on golden sheet October 2025 cycle:

**Users**: rommel (admin), isabel (admin), celiane (admin)

**Consultants** (10 from CSV with exact rates):

1. Gustavo Moutella Vilela - $30.00/hr
2. Enzo Gehlen - $26.05/hr
3. Fabiano Louback Gonçalves - $18.60/hr
4. Rafael Celegato - $35.00/hr
5. Kristof Berge - $17.93/hr
6. Lucas R. L. Martins - $22.00/hr
7. Arthur Felix - $26.00/hr
8. Tiago Lima - $23.12/hr
9. Fernando Motta - $13.00/hr
10. Guilherme Martini Bronzatti - $12.50/hr

**PayrollCycle** (October 2025):

- monthLabel: "2025-10"
- calculatedPaymentDate: 2025-10-25
- paymentArrivalDate: 2025-10-25
- sendReceiptDate: 2025-10-25
- sendInvoiceDate: 2025-10-25
- invoiceApprovalDate: 2025-10-01
- hoursLimitChangedOn: 2025-10-01
- additionalPaidOn: 2025-10-01
- globalWorkHours: 184
- omnigoBonus: 3111.00
- pagamentoPIX: 0.00
- pagamentoInter: 0.00
- equipmentsUSD: 0.00
- totalHourlyValue: 224.20 (computed, matches sum of rates)
- usdTotal: 44363.80 (computed, matches CSV B28)
- expectedArrivalDate: 2025-11-03

**CycleLineItems** (one per consultant with specific data from CSV):

1. Gustavo: bonusDate=2024-07-01, informedDate=2024-02-21, bonusPaydate=2025-07-01, rate=30.00
2. Enzo: adjustmentValue=3111.00, bonusDate=2024-06-02, informedDate=2025-05-15, bonusPaydate=2025-06-02, rate=26.05
3. Fabiano: bonusDate=2024-03-04, informedDate=2025-02-24, bonusPaydate=2025-03-04, rate=18.60
4. Rafael: bonusDate=2024-04-04, informedDate=2025-04-04, bonusPaydate=2025-04-04, rate=35.00
5. Kristof: bonusDate=2024-11-02, informedDate=null, bonusPaydate=2024-11-02, rate=17.93
6. Lucas: bonusDate=2024-12-02, informedDate=2024-12-02, bonusPaydate=2024-12-02, rate=22.00
7. Arthur: bonusDate=2025-09-01, informedDate=2025-09-01, bonusPaydate=2025-09-01, rate=26.00
8. Tiago: bonusDate=2025-05-02, informedDate=2025-05-02, bonusPaydate=2025-05-02, rate=23.12
9. Fernando: bonusDate=2025-10-01, informedDate=2025-09-12, bonusPaydate=2025-10-01, bonusAdvance=500.00, advanceDate=2025-03-14, rate=13.00
10. Guilherme: bonusDate=2025-08-02, informedDate=2025-07-10, bonusPaydate=2025-08-02, rate=12.50

## Implementation Steps

### 1. Setup monorepo

- Initialize Turborepo with pnpm workspaces
- Create apps/api, apps/web, packages/shared structure
- Configure turbo.json for build pipeline
- Root package.json with dev/build/start scripts

### 2. Backend foundation

- Setup Express server with TypeScript
- Install Prisma, initialize SQLite
- Define schema.prisma with all models
- Create initial migration
- Setup Zod schemas in packages/shared
- Implement JWT auth middleware
- Setup audit logging service

### 3. Business logic services

- CycleService: CRUD + auto-populate lines on create + recompute totals
- LineItemService: update + trigger cycle recompute
- ConsultantService: CRUD with validation
- InvoiceService, PaymentService: basic CRUD
- AuditService: log all mutations with JSON diff

### 4. API routes

- Auth routes with bcrypt password hashing
- Full CRUD endpoints for all entities
- Validation middleware with Zod
- Error handling middleware
- CORS configuration for localhost:5173

### 5. Seed script

- Create seed.ts with October 2025 cycle data
- 3 users, 10 consultants, 1 cycle with line items
- Run: `pnpm db:seed`

### 6. Frontend foundation

- Vite + React + TypeScript setup
- Install Shadcn/ui components (Button, Card, Table, Input, Calendar, etc.)
- Setup React Router with routes
- Configure TanStack Query client
- Create API client with fetch + JWT token handling
- Auth context + protected routes

### 7. Golden Sheet page

- TanStack Table with column definitions
- Inline editing cells with optimistic updates
- Date picker cells (Shadcn Calendar + Popover)
- Footer cards with editable fields
- Real-time computation display
- Sticky header and footer
- Loading and error states

### 8. Supporting pages

- Login page with form validation
- Dashboard with KPI cards and month selector
- Consultants page with CRUD forms
- Invoices and Payments pages (simple tables)
- Audit log viewer with filters

### 9. Polish and validation

- Form validation on all inputs
- Confirmation dialogs for destructive actions
- Toast notifications for success/error
- Loading spinners
- Responsive layout (primary target: desktop)
- Date formatting with date-fns

### 10. Testing and refinement

- Test cycle creation flow
- Test line item editing → totals update
- Test authentication and audit logs
- Test anomaly detection
- Create backup script
- Document environment setup in README

## Acceptance Criteria

- [ ] Create a cycle → auto-creates line items for all consultants with snapshotted rates
- [ ] Edit any line item → subtotal and cycle totals recompute instantly
- [ ] All header dates and footer values are editable and persist
- [ ] `/cycles/:id/summary` returns totals matching Excel formula
- [ ] Add consultant mid-cycle → can create line item with current rate
- [ ] App runs offline, no Excel dependency
- [ ] All state changes logged with userId in audit_log table
- [ ] Three users can log in: rommel, isabel, celiane

## Real-World Workflows (from Isabel's notes)

The MVP supports **data tracking** for these three monthly workflows:

**Workflow 1: Payment Processing (mid-month when payment arrives)**

- Update bonus consultant, dates, alternative payments in the Golden Sheet
- MVP provides: editable fields for all these values with computed totals
- Out of scope: TD API integration, Payoneer automation, email sending

**Workflow 2: Invoice Submission (last week of month)**

- Track invoice status, mark as sent/paid in Wave
- MVP provides: Invoice tracking page with sent/approved status
- Out of scope: Wave API integration, PDF generation, email automation

**Workflow 3: Consultant Invoice Review (first day of month)**

- Check all consultants sent invoices, approve hours, update TD hourly limits
- MVP provides: Invoice approval tracking, status badges for missing invoices
- Out of scope: Email notifications, TD/Payoneer CSV import, bulk payment automation

The Golden Sheet page will have all the fields needed to track these workflows manually, with computed totals and anomaly detection to reduce errors.

## Additional Business Data (Future Expansion Ideas)

The Excel workbook contains other sheets that could be integrated in future phases:

**Omnigo Service Fees** - Client billing rates by title/year

- Track client-facing rates vs. consultant costs
- Margin analysis and profitability reporting
- Could add: ClientRate model, profit margin calculations

**Laptop Date** - Equipment tracking

- Laptop assignments, purchase dates, replacements
- Could add: Equipment model with assignment history, depreciation tracking

**Mobile Purchases 2024** - Device procurement

- Testing device purchases for mobile team
- Could add: PurchaseOrder model, equipment inventory

**Staff Wages** - Historical compensation

- Negotiated rates, service fees, education tracking
- Already covered in Consultant model (hourlyRate, evaluationNotes)

**Time Off Notes** - PTO tracking

- Employee time off dates and descriptions
- Could add: TimeOff model with accrual tracking, integration with payroll cycles

These are documented for context but not part of the MVP scope.

## Phase 2 (Out of Scope)

- Ollama assistant for workflow guidance
- Email/reminder automations (missing invoices, payment due dates)
- Time Doctor API: sync hours, update hourly limits
- Wave Apps API: sync invoices, payment status
- Payoneer API: bulk payment export, transfer tracking
- CSV/PDF exports for external systems
- Advanced reporting and variance analysis
- Automated monthly backups with scheduling
- Workflow checklists with step-by-step guidance
- Equipment tracking module (laptops, mobile devices)
- Time off/PTO management
- Client billing rates and margin analysis
- Purchase order tracking

### To-dos

- [x] Initialize Turborepo monorepo with pnpm workspaces, create folder structure (apps/api, apps/web, packages/shared)
- [x] Setup Express + TypeScript, install Drizzle ORM, define complete schema.ts with all models including audit logging
- [x] Implement JWT authentication with bcrypt, create User model, auth middleware, and login endpoint
- [x] Build services for Cycle, LineItem, Consultant with automated calculation logic matching Excel formula
- [x] Create all REST endpoints with Zod validation, audit logging middleware, error handling
- [x] Write seed script with October 2025 cycle data from golden sheet (10 consultants, specific dates/values)
- [x] Initialize Vite + React, install Shadcn/ui, setup React Router, TanStack Query, auth context
- [x] Build main Golden Sheet page with TanStack Table, inline editing, date pickers, footer cards, real-time totals
- [x] Create Dashboard, Consultants CRUD, Invoices/Payments pages, Audit log viewer
- [x] Add form validation, confirmation dialogs, toast notifications, error handling, responsive layout