# Reset database script for VSol Admin
# This script deletes the database and reseeds it with the latest schema

Write-Host "🔄 Resetting database..." -ForegroundColor Yellow

# Change to API directory
Set-Location -Path "apps\api"

# Delete existing database
if (Test-Path "dev.db") {
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

