# Reset database script for VSol Admin
# This script deletes the database and reseeds it with the latest schema

Write-Host "🔄 Resetting database..." -ForegroundColor Yellow
Write-Host ""

# Change to API directory
Set-Location -Path "apps\api"

# Check if database exists and create backup
if (Test-Path "dev.db") {
    # Show database info
    $dbSize = (Get-Item "dev.db").Length / 1KB
    Write-Host "⚠️  WARNING: This will DELETE the current database!" -ForegroundColor Red
    Write-Host "   Current database size: $([math]::Round($dbSize, 2)) KB" -ForegroundColor Yellow
    Write-Host ""
    
    # Create backup first
    $timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
    $backupDir = "..\..\backups"
    
    # Create backups directory if it doesn't exist
    if (-not (Test-Path $backupDir)) {
        Write-Host "📁 Creating backups directory..." -ForegroundColor Gray
        New-Item -ItemType Directory -Force -Path $backupDir | Out-Null
    }
    
    $backupPath = Join-Path $backupDir "dev-before-reset-$timestamp.db"
    
    Write-Host "📦 Creating backup first..." -ForegroundColor Yellow
    Copy-Item "dev.db" $backupPath -Force
    
    $backupSize = (Get-Item $backupPath).Length / 1KB
    Write-Host "✅ Backup created: $backupPath" -ForegroundColor Green
    Write-Host "   Backup size: $([math]::Round($backupSize, 2)) KB" -ForegroundColor Gray
    Write-Host ""
    
    # Ask for confirmation
    Write-Host "Do you want to continue with the reset? (Y/N): " -ForegroundColor Yellow -NoNewline
    $confirmation = Read-Host
    
    if ($confirmation -ne 'Y' -and $confirmation -ne 'y') {
        Write-Host ""
        Write-Host "❌ Reset cancelled by user" -ForegroundColor Red
        Write-Host "   Your database has been backed up to: $backupPath" -ForegroundColor Cyan
        Set-Location -Path "..\..\"
        exit 0
    }
    
    Write-Host ""
    Write-Host "🗑️  Deleting old database..." -ForegroundColor Yellow
    Remove-Item -Force "dev.db"
    Write-Host "✅ Database deleted" -ForegroundColor Green
} else {
    Write-Host "ℹ️  No existing database found" -ForegroundColor Cyan
}

# Initialize schema
Write-Host "🚀 Initializing database schema..." -ForegroundColor Yellow
pnpm db:init

# Run seed
Write-Host "🌱 Seeding database with data..." -ForegroundColor Yellow
pnpm db:seed

# Return to root
Set-Location -Path "..\..\"

Write-Host ""
Write-Host "✅ Database reset complete!" -ForegroundColor Green
Write-Host "🚀 You can now run: pnpm dev" -ForegroundColor Cyan






