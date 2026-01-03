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

Default `.env` files have been created in `apps/api/.env` and `apps/web/.env` with development defaults.

For production or additional configuration, see `.env.example` in the root directory for all available options.

Minimum required configuration in `apps/api/.env`:
- `JWT_SECRET` - Change the default value to a secure random string (minimum 32 characters)

Optional configuration:
- `RESEND_KEY` - For email functionality (notifications, invoices)
- `TIME_DOCTOR_API_KEY` - For Time Doctor integration
- `CORS_ORIGIN` - For remote access (ngrok, Cloudflare Tunnel)

For local development, the default values work out of the box.

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

4. Create a configuration file at `%USERPROFILE%\.cloudflared\config-portal.yml`:
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

7. Start the application servers:
   ```powershell
   pnpm dev
   ```

8. Start the tunnel using the PowerShell script:
   ```powershell
   # Option 1: Use the provided script (recommended)
   & "$env:USERPROFILE\.cloudflared\start-portal-tunnel.ps1"
   
   # Option 2: Manual start
   cloudflared tunnel --config C:\Users\romme\.cloudflared\config-portal.yml run
   ```

   The script will:
   - Check if web app (port 5173) and API (port 2020) are running
   - Display warnings if services are not available
   - Start the tunnel with the correct configuration file

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
