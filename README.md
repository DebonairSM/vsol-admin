# VSol Admin - Golden Sheet Management

A local-first payroll management system that replaces Excel spreadsheets with a modern web application. Automates calculations, provides audit logging, and maintains data integrity for monthly consultant payroll cycles.

## Features

- **Monthly Payroll Cycles**: Create cycles that auto-generate line items for active consultants
- **Golden Sheet Interface**: Excel-like grid with inline editing for all payroll data
- **Automated Calculations**: Real-time subtotals and USD totals matching Excel formulas
- **Audit Logging**: Complete change history with user attribution
- **Consultant Management**: CRUD operations with rate snapshotting
- **Invoice & Payment Tracking**: Integrated with payroll cycles
- **Anomaly Detection**: Identify missing data and incomplete entries

## Tech Stack

- **Monorepo**: Turborepo + pnpm workspaces
- **Backend**: Node.js + Express, Drizzle ORM (SQLite), Zod validation
- **Frontend**: React + Vite, React Router, TanStack Query, Shadcn/ui
- **Database**: SQLite (`file:./dev.db`)
- **Auth**: JWT with bcrypt hashing

## Quick Start

### Prerequisites

- Node.js 18+
- pnpm 8+

### Installation

1. **Clone and install**:
   ```bash
   pnpm install
   ```

2. **Create environment files**:

   `apps/api/.env`:
   ```env
   PORT=4000
   JWT_SECRET=your-super-secret-jwt-key-change-in-production
   DATABASE_URL=file:./dev.db
   ```

   `apps/web/.env`:
   ```env
   VITE_API_URL=http://localhost:4000/api
   ```

3. **Initialize database**:
   ```bash
   pnpm db:migrate
   pnpm db:seed
   ```

4. **Start development**:
   ```bash
   pnpm dev
   ```

   - API: http://localhost:4000
   - Web: http://localhost:5173

### Login

- **Users**: rommel, isabel, celiane
- **Password**: admin123

## Project Structure

```
vsol-admin/
├── apps/
│   ├── api/          # Express backend with SQLite
│   └── web/          # React frontend
├── packages/
│   └── shared/       # Shared TypeScript types & Zod schemas
└── scripts/          # Database utilities
```

## Key Concepts

### Rate Snapshotting
Line items store a snapshot of the consultant's rate at cycle creation, preserving historical accuracy.

### Formula Logic
```
USD Total = (Total Hourly × Global Hours) - (PIX + Inter) + Omnigo Bonus + Equipment USD
```

### Audit Trail
Every mutation is logged with user, action type, entity, changes diff, and timestamp.

## Development

### Adding Fields

1. Update schema in `apps/api/src/db/schema.ts`
2. Generate migration: `pnpm db:migrate`
3. Update types in `packages/shared/src/types.ts`
4. Update schemas in `packages/shared/src/schemas.ts`

### Scripts

```bash
pnpm dev          # Start development servers
pnpm build        # Build for production
pnpm db:migrate   # Run migrations
pnpm db:seed      # Seed test data
pnpm db:studio    # Open Drizzle Studio
```

## Production Deployment

1. Set production environment variables
2. Run `pnpm db:migrate`
3. Start with `pnpm start`
4. Schedule regular backups with `pnpm backup:db`

## Troubleshooting

### Database not found
```bash
pnpm db:migrate  # Create tables
```

### Port conflicts
```bash
pnpm kill-all-ports  # Kill processes on 4000/5173
```

### Environment variables not loading
- Verify both `.env` files exist
- Restart `pnpm dev` after creating/editing `.env` files

## Documentation

- **Architectural Summary**: See `ARCHITECTURAL-REFACTORING-SUMMARY.md`
- **TypeScript Fixes**: See `PRE-EXISTING-ERRORS-FIXED.md`
