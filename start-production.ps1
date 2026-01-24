# VSol Admin - Cloudflare Tunnel Start Script
# This script starts the application in development mode with Cloudflare Tunnel

Write-Host "VSol Admin - Cloudflare Tunnel Start" -ForegroundColor Cyan
Write-Host ""

# Check if pnpm is installed
try {
    $pnpmVersion = pnpm --version
    Write-Host "pnpm version $pnpmVersion detected" -ForegroundColor Green
} catch {
    Write-Host "pnpm is not installed. Please install it first:" -ForegroundColor Red
    Write-Host "   npm install -g pnpm" -ForegroundColor Yellow
    exit 1
}

# Clean up ports that might be in use
Write-Host ""
Write-Host "Checking for processes on required ports..." -ForegroundColor Cyan
$ports = @(2020, 5173, 5174)
$killedAny = $false
foreach ($port in $ports) {
    $connections = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
    if ($connections) {
        foreach ($conn in $connections) {
            $process = Get-Process -Id $conn.OwningProcess -ErrorAction SilentlyContinue
            if ($process -and $process.Id -ne 0) {
                Write-Host "   Killing $($process.Name) (PID: $($process.Id)) on port $port" -ForegroundColor Yellow
                Stop-Process -Id $process.Id -Force -ErrorAction SilentlyContinue
                $killedAny = $true
            }
        }
    }
}
if ($killedAny) {
    Write-Host "   Ports cleared" -ForegroundColor Green
    Start-Sleep -Seconds 1
} else {
    Write-Host "   All ports are available" -ForegroundColor Green
}

# Check if dependencies are installed
Write-Host ""
Write-Host "Checking dependencies..." -ForegroundColor Cyan
if (-not (Test-Path "node_modules")) {
    Write-Host "Installing dependencies..." -ForegroundColor Yellow
    pnpm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Failed to install dependencies" -ForegroundColor Red
        exit 1
    }
}

# Configure environment for Cloudflare Tunnel
Write-Host ""
Write-Host "Configuring environment for Cloudflare Tunnel..." -ForegroundColor Cyan

# Ensure API .env exists
if (-not (Test-Path "apps\api\.env")) {
    Write-Host "   Creating apps/api/.env..." -ForegroundColor Yellow
    @"
PORT=2020
JWT_SECRET=your-secret-key-here-change-me-in-production
CORS_ORIGIN=https://portal.vsol.software
DATABASE_URL=file:./dev.db
"@ | Out-File -FilePath "apps\api\.env" -Encoding UTF8
    Write-Host "   Created apps/api/.env" -ForegroundColor Green
}

# Ensure Web .env has correct API URL for tunnel
if (-not (Test-Path "apps\web\.env")) {
    Write-Host "   Creating apps/web/.env..." -ForegroundColor Yellow
    @"
VITE_API_URL=https://api.portal.vsol.software/api
"@ | Out-File -FilePath "apps\web\.env" -Encoding UTF8
    Write-Host "   Created apps/web/.env with tunnel API URL" -ForegroundColor Green
} else {
    # Check if VITE_API_URL is set correctly
    $webEnvContent = Get-Content "apps\web\.env" -Raw
    if ($webEnvContent -notmatch "VITE_API_URL=https://api.portal.vsol.software/api") {
        Write-Host "   Updating VITE_API_URL in apps/web/.env..." -ForegroundColor Yellow
        @"
VITE_API_URL=https://api.portal.vsol.software/api
"@ | Out-File -FilePath "apps\web\.env" -Encoding UTF8
        Write-Host "   Updated apps/web/.env" -ForegroundColor Green
    }
}

# Check for Cloudflare Tunnel
Write-Host ""
Write-Host "Checking Cloudflare Tunnel setup..." -ForegroundColor Cyan

$cloudflaredInstalled = $false
try {
    $null = cloudflared --version
    $cloudflaredInstalled = $true
    Write-Host "   cloudflared is installed" -ForegroundColor Green
} catch {
    Write-Host "   cloudflared is not installed - Tunnel will not start" -ForegroundColor Yellow
    Write-Host "   Install with: winget install --id Cloudflare.cloudflared" -ForegroundColor Gray
}

$tunnelConfigPath = "$env:USERPROFILE\.cloudflared\config.yml"
$tunnelConfigExists = Test-Path $tunnelConfigPath
if ($tunnelConfigExists) {
    Write-Host "   Tunnel config found at: $tunnelConfigPath" -ForegroundColor Green
} else {
    Write-Host "   Tunnel config not found at: $tunnelConfigPath" -ForegroundColor Yellow
    Write-Host "   Tunnel will not start - see README.md for setup instructions" -ForegroundColor Gray
}

# Update tunnel config to use development ports
if ($tunnelConfigExists) {
    Write-Host ""
    Write-Host "Updating tunnel configuration for development ports..." -ForegroundColor Cyan
    @"
tunnel: 64674aa9-03b3-4063-82fe-0aae3d8642c5
credentials-file: C:\Users\Administrator\.cloudflared\64674aa9-03b3-4063-82fe-0aae3d8642c5.json

ingress:
  - hostname: portal.vsol.software
    service: http://localhost:5173
  - hostname: api.portal.vsol.software
    service: http://localhost:2020
  - service: http_status:404
"@ | Out-File -FilePath $tunnelConfigPath -Encoding UTF8
    Write-Host "   Updated tunnel config to use development ports (API: 2020, Web: 5173)" -ForegroundColor Green
}

# Start the application
Write-Host ""
Write-Host "Starting servers in development mode..." -ForegroundColor Green
Write-Host ""
Write-Host "   API Server:  http://localhost:2020" -ForegroundColor Cyan
Write-Host "   Web Dev:     http://localhost:5173" -ForegroundColor Cyan

if ($cloudflaredInstalled -and $tunnelConfigExists) {
    Write-Host "   Tunnel:      https://portal.vsol.software" -ForegroundColor Cyan
    Write-Host "                https://api.portal.vsol.software" -ForegroundColor Cyan
}

Write-Host ""
Write-Host "   Press Ctrl+C to stop the servers" -ForegroundColor Yellow
Write-Host ""

# Start Cloudflare Tunnel in background (if available)
$tunnelJob = $null
if ($cloudflaredInstalled -and $tunnelConfigExists) {
    Write-Host "Starting Cloudflare Tunnel..." -ForegroundColor Cyan
    $tunnelJob = Start-Job -ScriptBlock {
        param($configPath)
        cloudflared tunnel --config $configPath run
    } -ArgumentList $tunnelConfigPath
    Start-Sleep -Seconds 3
    Write-Host "Tunnel started!" -ForegroundColor Green
    Write-Host ""
}

# Start development servers in foreground (this will keep the window open)
Write-Host "Starting development servers..." -ForegroundColor Cyan
Write-Host ""
pnpm dev

# Cleanup: Stop all background jobs when dev servers are stopped
Write-Host ""
Write-Host "Stopping background services..." -ForegroundColor Yellow

if ($null -ne $tunnelJob) {
    Stop-Job -Job $tunnelJob -ErrorAction SilentlyContinue
    Remove-Job -Job $tunnelJob -ErrorAction SilentlyContinue
}

Write-Host "All services stopped." -ForegroundColor Green
