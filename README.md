# Company Portal

Local-first, SQLite-backed payroll management replacing the Excel "golden sheet" with real-time calculations and audit logging.

## Quick Start (Run the App)

If you've already installed the project, simply start the servers:

```powershell
pnpm dev
```

- API: <http://localhost:2020>
- Web: <http://localhost:5173>

**Login credentials:**

- Users: `rommel`, `isabel`, `celiane`
- Password: `admin123`

## Installation & Setup

First-time setup:

```powershell
cd C:\git\vsol-admin
pnpm install
pnpm db:migrate
pnpm db:seed
pnpm dev
```

### Environment Variables

Create `apps/api/.env`:

```env
PORT=2020
JWT_SECRET=change-me
DATABASE_URL=file:./dev.db
RESEND_KEY=your-resend-api-key  # Required for email functionality
RESEND_ADMIN_EMAIL=apmailbox@omnigo.com  # Optional, defaults to this
```

Create `apps/web/.env`:

```env
VITE_API_URL=http://localhost:2020/api
```

## Common Commands

```bash
pnpm dev              # Run API (port 2020) and Web (port 5173)
pnpm build            # Build all packages
pnpm db:migrate       # Apply database migrations
pnpm db:seed          # Seed development data
pnpm db:studio        # Open Drizzle Studio (database GUI)
pnpm kill-all-ports   # Free ports 2020/5173 (Windows PowerShell)
```

## Change User Password

```bash
cd apps/api
pnpm user:change-password <username> <new-password>
```

**Note:** Make sure the API server is not running when changing passwords.

## Public Access (ngrok)

To expose the app via ngrok:

1. Start ngrok tunnels:

   ```bash
   # Terminal 1: API tunnel
   ngrok http 2020
   
   # Terminal 2: Web tunnel
   ngrok http 5173
   ```

2. Update environment variables:

   - `apps/api/.env`: Add `CORS_ORIGIN=https://your-web-ngrok-url.ngrok.io`
   - `apps/web/.env`: Add `VITE_API_URL=https://your-api-ngrok-url.ngrok.io/api`

3. Restart servers and access via ngrok URLs

## Project Structure

```text
vsol-admin/
├── apps/
│   ├── api/      # Express + Drizzle (SQLite)
│   └── web/      # React + Vite (SPA)
└── packages/
    └── shared/   # Types + Zod schemas
```

## Tech Stack

- Monorepo: Turborepo, pnpm workspaces
- Backend: Node.js, Express, Drizzle ORM (SQLite), Zod
- Frontend: React, Vite, TanStack Query, TanStack Table, Shadcn/ui, Tailwind CSS
