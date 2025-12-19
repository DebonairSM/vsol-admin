# Company Portal

Local-first, SQLite-backed payroll management application.

## Installation

First-time setup:

```powershell
cd C:\git\vsol-admin
pnpm install
pnpm db:migrate
pnpm db:seed
```

### Environment Variables

Create `apps/api/.env`:

```env
PORT=2020
JWT_SECRET=change-me
DATABASE_URL=file:./dev.db
RESEND_KEY=your-resend-api-key
RESEND_ADMIN_EMAIL=apmailbox@omnigo.com
```

Create `apps/web/.env`:

```env
VITE_API_URL=http://localhost:2020/api
```

## Running the Application

Start the development servers:

```powershell
pnpm dev
```

- API: http://localhost:2020
- Web: http://localhost:5173

**Login credentials:**
- Users: `rommel`, `isabel`, `celiane`
- Password: `admin123`

## Public Access

### Cloudflare Tunnel (Production)

For production access via `portal.vsol.software`:

1. Install cloudflared:
   ```powershell
   winget install --id Cloudflare.cloudflared
   ```
   Or download from: https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/installation/

2. Authenticate with Cloudflare:
   ```powershell
   cloudflared tunnel login
   ```

3. Create a tunnel (if not already created):
   ```powershell
   cloudflared tunnel create portal-vsol
   ```

4. Create a configuration file at `%USERPROFILE%\.cloudflared\config.yml`:
   ```yaml
   tunnel: <tunnel-id>
   credentials-file: %USERPROFILE%\.cloudflared\<tunnel-id>.json

   ingress:
     - hostname: portal.vsol.software
       service: http://localhost:5173
     - hostname: api.portal.vsol.software
       service: http://localhost:2020
     - service: http_status:404
   ```

5. Route DNS in Cloudflare dashboard:
   - Create CNAME record: `portal.vsol.software` → `<tunnel-id>.cfargotunnel.com`
   - Create CNAME record: `api.portal.vsol.software` → `<tunnel-id>.cfargotunnel.com`

6. Update environment variables:

   `apps/api/.env`:
   ```env
   CORS_ORIGIN=https://portal.vsol.software
   ```

   `apps/web/.env`:
   ```env
   VITE_API_URL=https://api.portal.vsol.software/api
   ```

7. Start the tunnel:
   ```powershell
   cloudflared tunnel run portal-vsol
   ```

8. Start the application servers:
   ```powershell
   pnpm dev
   ```

The application will be accessible at https://portal.vsol.software

### ngrok (Development/Testing)

For quick testing with ngrok:

1. Start ngrok tunnels:
   ```powershell
   # Terminal 1: API tunnel
   ngrok http 2020
   
   # Terminal 2: Web tunnel
   ngrok http 5173
   ```

2. Update environment variables:
   - `apps/api/.env`: Add `CORS_ORIGIN=https://your-web-ngrok-url.ngrok.io`
   - `apps/web/.env`: Add `VITE_API_URL=https://your-api-ngrok-url.ngrok.io/api`

3. Restart servers and access via ngrok URLs
