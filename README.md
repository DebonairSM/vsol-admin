# VSol Admin - Golden Sheet MVP

A local-first, SQLite-backed application that replaces the Excel-based "golden sheet" for managing monthly consultant payroll cycles. The system automates calculations, provides audit logging, and maintains data integrity while preserving the familiar workflow.

## Features

- **Monthly Payroll Cycles**: Create and manage monthly consultant payroll with automated line item creation
- **Golden Sheet Interface**: Excel-like grid with inline editing for all payroll data
- **Automated Calculations**: Real-time computation of subtotals and USD totals using Excel formula logic
- **Audit Logging**: Track all state changes with user attribution
- **Consultant Management**: CRUD operations with termination date support
- **Time Doctor Integration**: Sync payroll settings and rates with Time Doctor API
- **Invoice & Payment Tracking**: Integrated tracking with cycles
- **Anomaly Detection**: Identify missing data, bonuses without dates, etc.

## Tech Stack

- **Monorepo**: Turborepo + pnpm workspaces
- **Backend**: Node.js + Express, Drizzle ORM (SQLite), Zod validation
- **Frontend**: React + Vite, React Router v6, TanStack Query, TanStack Table, Shadcn/ui, date-fns
- **Database**: SQLite (`file:./dev.db`)
- **Auth**: JWT with username/password (users: rommel, isabel, celiane)

## Quick Start

### Prerequisites

- Node.js 18+
- pnpm 8+

### Installation

1. **Clone and install dependencies**:
   ```bash
   git clone <repository-url>
   cd vsol-admin
   pnpm install
   ```

2. **Set up environment variables**:
   
   Create `apps/api/.env`:
   ```bash
   PORT=4000
   NODE_ENV=development
   JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
   DATABASE_URL=file:./dev.db
   ```
   
   Create `apps/web/.env`:
   ```bash
   VITE_API_URL=http://localhost:4000/api
   ```
   
   **Note**: The API server uses `dotenv` to automatically load environment variables from the `.env` file. The `import 'dotenv/config'` is already configured in `src/server.ts`.

3. **Initialize database and seed data**:
   ```bash
   pnpm db:migrate
   pnpm db:seed
   ```

4. **Start development servers**:
   ```bash
   pnpm dev
   ```

   This starts:
   - API server: http://localhost:3000
   - Web app: http://localhost:5173

### Default Login Credentials

- **rommel** / admin123
- **isabel** / admin123  
- **celiane** / admin123

## Project Structure

```
vsol-admin/
├── apps/
│   ├── api/                    # Express API server
│   │   ├── src/
│   │   │   ├── server.ts       # Entry point
│   │   │   ├── routes/         # REST endpoints
│   │   │   ├── services/       # Business logic
│   │   │   ├── middleware/     # Auth, validation, error handling
│   │   │   ├── db/             # Drizzle schema & client
│   │   │   └── lib/            # Utilities
│   │   ├── drizzle/            # Database migrations
│   │   └── scripts/            # Backup utilities
│   └── web/                    # React SPA
│       ├── src/
│       │   ├── routes/         # Page components
│       │   ├── components/     # UI components
│       │   ├── hooks/          # React Query hooks
│       │   ├── contexts/       # Auth context
│       │   └── lib/            # API client, utils
├── packages/
│   └── shared/                 # Shared types, Zod schemas
└── backups/                    # Database backups
```

## Key Features

### Golden Sheet Page

The main interface replicates the Excel workflow:

- **Inline Editing**: Click any cell to edit values
- **Real-time Calculations**: Subtotals and USD total update automatically
- **Date Pickers**: Easy date selection for bonus dates, informed dates, etc.
- **Checkbox Controls**: Toggle invoice sent status
- **Computed Fields**: Rate per hour (snapshotted), subtotals (calculated)

### Formula Logic

The USD total calculation matches the Excel formula exactly:
```
USD Total = (Total Hourly Value × Global Work Hours) - (Pagamento PIX + Pagamento Inter) + Omnigo Bonus + Equipments USD
```

### Audit Trail

Every mutation is logged with:
- User ID (who made the change)
- Action type (CREATE_CYCLE, UPDATE_LINE_ITEM, etc.)
- Entity type and ID
- JSON diff of changes
- Timestamp

## API Endpoints

### Authentication
- `POST /api/auth/login` - Login with username/password
- `GET /api/auth/me` - Get current user info

### Consultants
- `GET /api/consultants` - List all consultants
- `GET /api/consultants/active` - List active consultants only
- `POST /api/consultants` - Create consultant
- `PUT /api/consultants/:id` - Update consultant
- `DELETE /api/consultants/:id` - Delete consultant (soft delete if used in cycles)

### Cycles
- `GET /api/cycles` - List all cycles
- `POST /api/cycles` - Create cycle (auto-creates line items for active consultants)
- `GET /api/cycles/:id` - Get cycle with line items
- `PUT /api/cycles/:id` - Update cycle header/footer
- `GET /api/cycles/:id/summary` - Get computed totals and anomalies
- `PUT /api/cycles/:cycleId/lines/:lineId` - Update line item

### Invoices & Payments
- `GET /api/invoices?cycleId=X` - List invoices
- `POST /api/invoices` - Create invoice
- `PUT /api/invoices/:id` - Update invoice
- `GET /api/payments?cycleId=X` - List payments
- `POST /api/payments` - Create payment
- `DELETE /api/payments/:id` - Delete payment

### Audit
- `GET /api/audit?cycleId=X&userId=Y` - Get audit log entries

## Database Schema

### Core Models

- **User**: Authentication and audit trail
- **Consultant**: Master data with hourly rates and termination dates
- **PayrollCycle**: Monthly cycle with header dates and footer values
- **CycleLineItem**: Per-consultant data for each cycle (rates are snapshotted)
- **Invoice**: Explicit invoice tracking
- **Payment**: Payment records with types (REGULAR, BONUS, ADVANCE, ADJUSTMENT)
- **AuditLog**: Complete change history

### Key Design Decisions

1. **Rate Snapshotting**: `CycleLineItem.ratePerHour` captures the consultant's rate at cycle creation time, preserving historical accuracy
2. **Soft Deletes**: Consultants used in cycles cannot be hard deleted
3. **Computed Fields**: Subtotals and USD totals are calculated on-the-fly, not stored
4. **Audit Everything**: All mutations create audit log entries

## Scripts

```bash
# Development
pnpm dev                    # Start both API and web in dev mode
pnpm build                  # Build for production
pnpm start                  # Start production build

# Database
pnpm db:migrate             # Run database migrations
pnpm db:studio              # Open Drizzle Studio (database GUI)
pnpm db:seed                # Seed with October 2025 cycle data
pnpm backup:db              # Create database backup
```

## Seeded Data

The application comes with realistic seed data:

- **3 Users**: rommel, isabel, celiane (all admin role)
- **10 Consultants**: Real names and rates from the golden sheet
- **1 Payroll Cycle**: October 2025 with complete line items
- **Specific Data**: Bonus dates, informed dates, advance amounts matching the original sheet

## Development

### Adding New Fields

1. Update Drizzle schema in `apps/api/src/db/schema.ts`
2. Generate migration: `pnpm --filter @vsol-admin/api db:generate`
3. Run migration: `pnpm db:migrate`
4. Update types in `packages/shared/src/types.ts`
5. Update Zod schemas in `packages/shared/src/schemas.ts`
6. Add to Golden Sheet table columns

### Business Logic

All calculations are in `apps/api/src/services/cycle-service.ts`:
- `calculateLineItemSubtotal()` - Per-consultant subtotal
- `getSummary()` - Cycle totals and anomaly detection

### Frontend State

- **Server State**: TanStack Query for all API data
- **Form State**: React useState for inline editing
- **Auth State**: React Context for JWT token
- **No Redux**: TanStack Query handles all server state needs

## Production Deployment

1. **Build the application**:
   ```bash
   pnpm build
   ```

2. **Set production environment variables**:
   ```bash
   DATABASE_URL="file:./production.db"
   JWT_SECRET="secure-production-secret"
   NODE_ENV="production"
   ```

3. **Run migrations and start**:
   ```bash
   pnpm db:migrate
   pnpm start
   ```

4. **Set up backups**: Schedule `pnpm backup:db` to run regularly

## Acceptance Criteria ✅

- [x] Create a cycle → auto-creates line items for all consultants with snapshotted rates
- [x] Edit any line item → subtotal and cycle totals recompute instantly  
- [x] All header dates and footer values are editable and persist
- [x] `/cycles/:id/summary` returns totals matching Excel formula
- [x] Add consultant mid-cycle → can create line item with current rate
- [x] App runs offline, no Excel dependency
- [x] All state changes logged with userId in audit_log table
- [x] Three users can log in: rommel, isabel, celiane

## Troubleshooting Common Setup Issues

### Database Issues

**Error: `SQLITE_ERROR: no such table: users`**
- **Cause**: Database tables haven't been created yet
- **Solution**: 
  ```bash
  cd apps/api
  npx drizzle-kit push:sqlite
  pnpm db:seed
  ```

**Error: `$onUpdateFn is not a function`**
- **Cause**: Old schema file with unsupported SQLite method
- **Solution**: Remove `.$onUpdateFn(() => new Date())` from schema, handle `updatedAt` manually in services

### Server Connection Issues

**Error: `Server running on port 3000` (when you want port 4000)**
- **Cause**: Missing `dotenv` package or incorrect `.env` file
- **Solution**: 
  1. Install dotenv: `cd apps/api && pnpm add dotenv`
  2. Add `import 'dotenv/config';` to top of `server.ts`
  3. Verify `apps/api/.env` contains `PORT=4000`

**Error: `POST http://localhost:3000/api/auth/login net::ERR_CONNECTION_REFUSED`**
- **Cause**: Frontend still connecting to wrong port
- **Solution**: Create `apps/web/.env` with `VITE_API_URL=http://localhost:4000/api` and restart dev server

**Error: `CORS policy` or `Access-Control-Allow-Origin`**
- **Cause**: API server not running or wrong port configuration
- **Solution**: Ensure both environment files exist and restart `pnpm dev`

### Environment Variable Setup

**Frontend still uses localhost:3000**
- **Cause**: Missing `apps/web/.env` file
- **Remember**: Frontend needs its own `.env` file with `VITE_` prefixed variables
- **Solution**: Create `apps/web/.env` with `VITE_API_URL=http://localhost:4000/api`

**Server doesn't load .env variables**
- **Cause**: Missing `dotenv` package or import
- **Solution**: Ensure `import 'dotenv/config';` is first line in `server.ts`

### Key Setup Requirements

1. **Both apps need .env files**: `apps/api/.env` AND `apps/web/.env`
2. **Database initialization**: Must run `push:sqlite` and `seed` commands
3. **Full restart required**: After creating `.env` files, restart entire `pnpm dev` process
4. **Port consistency**: API port in `apps/api/.env` must match `VITE_API_URL` in `apps/web/.env`

### Default Credentials (after seeding)
- **Username**: rommel, isabel, or celiane
- **Password**: admin123

## Time Doctor Integration

The system integrates with Time Doctor's payroll API to synchronize consultant rates, hourly limits, and payee information.

### Configuration

Add these environment variables to `apps/api/.env`:

```env
# Time Doctor Integration
TIME_DOCTOR_API_KEY=your-time-doctor-api-key-here
TIME_DOCTOR_BASE_URL=https://api2.timedoctor.com
TIME_DOCTOR_SYNC_INTERVAL=3600
```

### Features

- **Payroll Settings Interface**: Time Doctor-style table showing consultant payroll information
- **Automatic Sync**: Sync all consultants or individual consultants with Time Doctor data
- **Sync Status Tracking**: Monitor last sync times and API connection status
- **Selective Sync**: Enable/disable Time Doctor sync per consultant
- **Rate & Limit Management**: Sync hourly rates and hourly limits from Time Doctor

### Usage

1. Navigate to **Consultants > Payroll Settings** tab
2. Configure Time Doctor API credentials in environment variables
3. Use "Sync All" to sync all active consultants
4. Use individual "Sync" buttons for specific consultants
5. Toggle sync enabled/disabled per consultant as needed

### API Endpoints

- `GET /api/time-doctor/status` - Check sync status
- `GET /api/time-doctor/sync` - Sync all consultants
- `POST /api/time-doctor/sync/:consultantId` - Sync specific consultant
- `PUT /api/time-doctor/consultant/:consultantId/toggle-sync` - Enable/disable sync
- `GET /api/time-doctor/settings` - Fetch Time Doctor payroll settings

## Future Enhancements (Phase 2)

- Ollama assistant integration for workflow guidance
- Email/reminder automations
- Wave Apps API integration  
- Payoneer API integration
- CSV/PDF exports
- Advanced reporting and variance analysis
- Equipment tracking module
- Time off/PTO management
- Client billing rates and margin analysis

## Support

For questions or issues, check the audit log for debugging state changes, or examine the browser network tab for API errors. All mutations are logged with full context for troubleshooting.
