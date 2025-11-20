# VSol Admin

Local‑first, SQLite‑backed payroll management replacing the Excel "golden sheet" with real‑time calculations and audit logging.

## Start (PowerShell)

```powershell
cd C:\git
cd .\vsol-admin
pnpm install
pnpm db:migrate
pnpm db:seed
pnpm dev
```

- API: http://localhost:2020
- Web: http://localhost:5173

## Environment

- `apps/api/.env`
  - `PORT=2020`
  - `JWT_SECRET=change-me`
  - `DATABASE_URL=file:./dev.db`
  - `BACKUP_DIRECTORY` (optional) - Directory path for database backups. If not set, automatically detects OneDrive Documents folder (e.g., `C:\Users\<username>\OneDrive\Documents\backups`). Falls back to `backups/` in project directory if OneDrive is not found.
  - `CORS_ORIGIN` (optional) - Comma-separated list of allowed origins for CORS. Supports exact URLs and wildcard patterns (e.g., `https://abc123.ngrok.io` or `*.ngrok.io`). If not set, defaults to `http://localhost:5173` in development mode.
- `apps/web/.env`
  - `VITE_API_URL=http://localhost:2020/api` - Backend API base URL. For ngrok setup, set this to your API ngrok URL (e.g., `https://def456.ngrok.io/api`)

## Tech Stack

- Monorepo: Turborepo, pnpm workspaces
- Backend: Node.js, Express, Drizzle ORM (SQLite via libsql), Zod, helmet, cors, multer, date-fns, jsonwebtoken, bcryptjs
- Frontend: React 18, Vite 5, React Router v6, TanStack Query v5, TanStack Table v8, Shadcn/ui (Radix primitives), Tailwind CSS (+ tailwindcss-animate), react-day-picker, lucide-react, sonner
- Shared: TypeScript types + Zod schemas (`@vsol-admin/shared`)
- Tooling: TypeScript 5, tsx, Vitest (+ UI), Drizzle Kit, PostCSS, Autoprefixer

## Workflow (simplified)

1. Login with username/password → receive JWT
2. Create payroll cycle (month, global hours, bonuses)
   - Active consultants are fetched (no termination date)
   - Line items are auto‑created with a snapshot of `ratePerHour`
3. Edit line items inline on Golden Sheet
   - `workHours` default to cycle `globalWorkHours` if null
   - Subtotal per line: `(workHours × ratePerHour) + adjustmentValue − bonusAdvance`
4. Footer totals recompute in real time
   - `totalHourlyValue = SUM(ratePerHour across lines)`
   - `usdTotal = (totalHourlyValue × globalWorkHours) − (pagamentoPIX + pagamentoInter) + omnigoBonus + equipmentsUSD`
5. Invoices and payments tracked per cycle
6. All mutations are audit‑logged with user, entity, and change diff

```mermaid
flowchart TD

  %% Authentication
  subgraph Auth
    A[Login] -->|POST /auth/login| T[JWT Issued]
    T --> B[Dashboard]
  end

  %% Payroll Cycle Management
  subgraph CycleManagement["Cycle Management"]
    B --> C[Create Cycle]
    C -->|Auto-snapshot rates| D[Auto Line Items]
    D --> E[Golden Sheet Inline Edit]
    E --> F[Recompute Subtotals]
    F --> G[Recompute Footer Totals]
    G --> S1[Compute USD Total]
  end

  %% 9-Step Workflow Dates tracked on cycle header
  subgraph WorkflowDates["Workflow Dates - 9 Steps"]
    direction LR
    W1[Send Invoice] --> W2[Invoice Accepted]
    W2 --> W3[Client Payment Scheduled]
    W3 --> W4[Calculate Payment]
    W4 --> W5[Payment Arrival]
    W5 --> W6[Send Receipt]
    W6 --> W7[Invoice Approval]
    W7 --> W8[Consultants Paid]
    W8 --> W9[Hours Limit Changed]
  end

  %% Bonus Workflow (Omnigo bonus)
  subgraph BonusWorkflow["Bonus Workflow"]
    C --> BW0[Create Bonus Workflow]
    BW0 --> BW1["Select Recipient<br/>(auto-detect from line items)"]
    BW1 --> BW2[Set Announcement Date]
    BW2 --> BW3["Generate Email<br/>netBonus = omnigoBonus - bonusAdvance"]
    BW3 --> BW4[Mark Paid With Payroll]
    BW4 --> BW5[Set Bonus Payment Date]
  end

  %% Invoices & Payments
  subgraph InvoicesPayments["Invoices & Payments"]
    I1[Create/Edit Invoices] --> I2["Record Payments<br/>PIX / Inter"]
    I2 --> W5
  end

  %% Work Hours Management
  subgraph WorkHours["Work Hours"]
    WH1[Import Work Hours JSON] --> WH2[Track Monthly Hours]
    WH2 --> WH3[Suggest Hours for New Cycle]
    WH3 --> C
  end

  %% Time Doctor Integration
  subgraph TimeDoctor["Time Doctor"]
    TD1[Sync All / One Consultant] --> TD2[Toggle Sync per Consultant]
    TD1 --> D
    TD2 --> D
    TD3[Fetch Payroll Settings]
  end

  %% Equipment Management
  subgraph Equipment
    EQ1[Assign Equipment] --> EQ2[Pending Returns]
    EQ2 --> EQ3[Mark Returned]
    EQ3 --> G
  end

  %% Consultants
  subgraph Consultants
    CO1[CRUD Consultants] --> CO2[Terminate Consultant]
    CO1 --> C
  end

  %% Settings
  subgraph Settings
    ST1[Update Default Omnigo Bonus] --> C
  end

  %% Domain Models
  subgraph DomainModels["Domain Models"]
    direction TB
    DM1[User]
    DM2[Consultant]
    DM3[PayrollCycle]
    DM4[CycleLineItem]
    DM5[Invoice]
    DM6[Payment]
    DM7[ConsultantEquipment]
    DM8[MonthlyWorkHours]
    DM9[BonusWorkflow]
    DM10[SystemSettings]
  end

  %% Audit Log (separate, not linked)
  subgraph AuditSystem["Audit System"]
    AL1[(AuditLog)]
  end

  classDef audit fill:#ffeaea,stroke:#ff6b6b,stroke-width:1px,color:#993333;
  AL1:::audit
```

## Formulas

- Line subtotal: `(workHours × ratePerHour) + adjustmentValue − bonusAdvance`
- Cycle USD total: `=B22*B26-(B23+B24)+B25+B27`
  - `B22 = totalHourlyValue`, `B26 = globalWorkHours`, `B23 = pagamentoPIX`, `B24 = pagamentoInter`, `B25 = omnigoBonus`, `B27 = equipmentsUSD`

## Login (dev)

- Users: `rommel`, `isabel`, `celiane`
- Password: `admin123`

## Changing User Passwords

To change a user's password, use the password change script:

```bash
# From the root directory
cd apps/api
pnpm user:change-password <username> <new-password>

# Example: Change rommel's password
pnpm user:change-password rommel myNewPassword123
```

Or run directly with tsx:

```bash
cd apps/api
pnpm tsx scripts/change-password.ts <username> <new-password>
```

The script will:
- Hash the new password using Argon2id
- Update the user's password in the database
- Display confirmation with user details

**Note**: Make sure the API server is not running when changing passwords, or ensure the database is not locked.

## ngrok Setup (Public Access)

**Current ngrok URLs**: See `NGROK_URLS.md` for active tunnel URLs and configuration.

To expose the application via ngrok public URLs:

1. Start ngrok tunnels:
   ```bash
   # Terminal 1: API tunnel
   ngrok http 2020
   # Copy the HTTPS URL (e.g., https://def456.ngrok.io)
   
   # Terminal 2: Web tunnel
   ngrok http 5173
   # Copy the HTTPS URL (e.g., https://abc123.ngrok.io)
   ```

2. Configure environment variables:
   - `apps/api/.env`: Add `CORS_ORIGIN=https://abc123.ngrok.io` (use your web ngrok URL)
   - `apps/web/.env`: Add `VITE_API_URL=https://def456.ngrok.io/api` (use your API ngrok URL)

3. Restart servers:
   - Restart API server to pick up `CORS_ORIGIN`
   - Restart web dev server to pick up `VITE_API_URL`

4. Access:
   - Frontend: Open your web ngrok URL in browser
   - API health check: `https://your-api-ngrok-url.ngrok.io/health`

**Note**: You can also use wildcard patterns like `*.ngrok.io` in `CORS_ORIGIN` for dynamic ngrok domains, or comma-separate multiple origins.

## Scripts

```bash
pnpm dev         # Run API (2020) and Web (5173)
pnpm build       # Build all packages
pnpm db:migrate  # Apply migrations
pnpm db:seed     # Seed dev data
pnpm db:studio   # Drizzle Studio
pnpm kill-all-ports  # Free 2020/5173 if needed (Windows PowerShell)
```

## Structure

```
vsol-admin/
├── apps/
│   ├── api/      # Express + Drizzle (SQLite)
│   └── web/      # React + Vite (SPA)
└── packages/
    └── shared/   # Types + Zod schemas
```
