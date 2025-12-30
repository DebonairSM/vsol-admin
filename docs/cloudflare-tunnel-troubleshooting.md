# Cloudflare Tunnel Troubleshooting Guide

## Error 1033: Tunnel Connection Failed

This error indicates that Cloudflare cannot resolve the tunnel connection to your origin server. The tunnel service (`cloudflared`) is either not running, disconnected, or misconfigured.

## Quick Diagnosis Steps

### 1. Check if cloudflared is running

On Windows (PowerShell):
```powershell
Get-Process cloudflared -ErrorAction SilentlyContinue
```

If no process is found, the tunnel is not running.

### 2. Check if local servers are running

The tunnel requires both servers to be running:
- API server: `http://localhost:2020`
- Web server: `http://localhost:5173`

Verify they're running:
```powershell
# Check if ports are in use
netstat -ano | findstr ":2020"
netstat -ano | findstr ":5173"
```

Or start them:
```powershell
pnpm dev
```

### 3. Verify tunnel configuration

Check your tunnel configuration file at `%USERPROFILE%\.cloudflared\config.yml`:

```yaml
tunnel: <your-tunnel-id>
credentials-file: %USERPROFILE%\.cloudflared\<tunnel-id>.json

ingress:
  - hostname: portal.vsol.software
    service: http://localhost:5173
  - hostname: api.portal.vsol.software
    service: http://localhost:2020
  - service: http_status:404
```

**Common issues:**
- Wrong tunnel ID
- Missing credentials file
- Incorrect port numbers (should be 5173 for web, 2020 for API)
- Wrong hostname format

### 4. Check tunnel status

List your tunnels:
```powershell
cloudflared tunnel list
```

Check if the tunnel exists and note its ID.

### 5. Verify DNS configuration

In Cloudflare dashboard, check DNS records:
- `portal.vsol.software` → CNAME → `<tunnel-id>.cfargotunnel.com`
- `api.portal.vsol.software` → CNAME → `<tunnel-id>.cfargotunnel.com`

Both should be proxied (orange cloud icon).

## Step-by-Step Fix

### Step 1: Start local servers

```powershell
# In project root
cd C:\git\vsol-admin
pnpm dev
```

Wait for both servers to start:
- API: http://localhost:2020
- Web: http://localhost:5173

### Step 2: Verify tunnel configuration

```powershell
# Check if config file exists
Test-Path "$env:USERPROFILE\.cloudflared\config.yml"

# View config (if it exists)
Get-Content "$env:USERPROFILE\.cloudflared\config.yml"
```

### Step 3: Start the tunnel

```powershell
cloudflared tunnel run portal-vsol
```

**Expected output:**
```
2024-XX-XX INF +--------------------------------------------------------------------------------------------+
2024-XX-XX INF |  Your quick Tunnel has been created! Visit it at (it may take some time to be reachable):  |
2024-XX-XX INF |  https://portal.vsol.software                                                              |
2024-XX-XX INF +--------------------------------------------------------------------------------------------+
```

If you see errors, note them for diagnosis.

### Step 4: Verify tunnel is running

Keep the tunnel terminal open. The tunnel must remain running for the connection to work.

## Common Issues and Solutions

### Issue: "Tunnel not found"

**Solution:**
```powershell
# List tunnels to find the correct ID
cloudflared tunnel list

# Or create a new tunnel
cloudflared tunnel create portal-vsol
```

### Issue: "Credentials file not found"

**Solution:**
1. Get your tunnel ID: `cloudflared tunnel list`
2. Verify credentials file exists: `Test-Path "$env:USERPROFILE\.cloudflared\<tunnel-id>.json"`
3. If missing, you may need to re-authenticate:
   ```powershell
   cloudflared tunnel login
   ```

### Issue: "Connection refused" or "Cannot connect to localhost:5173"

**Solution:**
- Ensure `pnpm dev` is running
- Verify ports 5173 (web) and 2020 (API) are not blocked by firewall
- Check if another process is using these ports

### Issue: Tunnel starts but still shows Error 1033

**Possible causes:**
1. **DNS propagation delay**: Wait 5-10 minutes after creating/updating DNS records
2. **Wrong tunnel ID in DNS**: Verify CNAME records point to correct tunnel ID
3. **Tunnel not routed**: Check Cloudflare dashboard → Zero Trust → Tunnels → Routes
4. **Firewall blocking**: Ensure cloudflared can make outbound connections

### Issue: Tunnel disconnects frequently

**Solution:**
Run tunnel as a Windows service for stability:

```powershell
# Install as service
cloudflared service install

# Or use a process manager like PM2
npm install -g pm2
pm2 start cloudflared --name tunnel -- tunnel run portal-vsol
pm2 save
pm2 startup
```

## Verification Checklist

- [ ] Local API server running on port 2020
- [ ] Local web server running on port 5173
- [ ] Tunnel configuration file exists and is correct
- [ ] Tunnel credentials file exists
- [ ] Tunnel is running (`cloudflared tunnel run portal-vsol`)
- [ ] DNS records configured correctly in Cloudflare
- [ ] DNS records are proxied (orange cloud)
- [ ] No firewall blocking cloudflared
- [ ] Environment variables set correctly:
  - `apps/api/.env`: `CORS_ORIGIN=https://portal.vsol.software`
  - `apps/web/.env`: `VITE_API_URL=https://api.portal.vsol.software/api`

## Testing the Connection

1. **Test local servers directly:**
   - http://localhost:5173 (web)
   - http://localhost:2020/api/health (API, if health endpoint exists)

2. **Test tunnel connection:**
   - https://portal.vsol.software
   - https://api.portal.vsol.software/api/health

3. **Check tunnel logs:**
   The terminal running `cloudflared tunnel run` will show connection logs and any errors.

## Getting Help

If the issue persists:

1. Check Cloudflare dashboard → Zero Trust → Tunnels for tunnel status
2. Review tunnel logs in the terminal where `cloudflared tunnel run` is executing
3. Verify network connectivity (can cloudflared reach Cloudflare's edge?)
4. Check Windows Event Viewer for cloudflared service errors (if running as service)

## Alternative: Quick Test with ngrok

If you need immediate access while troubleshooting:

```powershell
# Terminal 1: API
ngrok http 2020

# Terminal 2: Web
ngrok http 5173
```

Update environment variables temporarily to use ngrok URLs.

