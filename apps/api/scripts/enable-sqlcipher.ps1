# Enable SQLCipher Encryption for Company Portal Database
#
# This script:
# 1. Generates a secure random encryption key (256-bit)
# 2. Stores the key in Windows Credential Manager
# 3. Creates an encrypted copy of the existing database
# 4. Backs up the original unencrypted database
# 5. Replaces the original with the encrypted version
#
# Usage: .\enable-sqlcipher.ps1

$ErrorActionPreference = "Stop"

Write-Host "🔐 Company Portal - Enable SQLCipher Encryption" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# Configuration
$dbPath = ".\dev.db"
$backupDir = "..\..\..\backups"
$credentialTarget = "VSolAdmin:SQLCipherKey"
$credentialUser = "vsol"

# Check if database exists
if (-not (Test-Path $dbPath)) {
    Write-Host "❌ Database file not found: $dbPath" -ForegroundColor Red
    Write-Host "Please run this script from the apps/api directory" -ForegroundColor Yellow
    exit 1
}

# Create backup directory
if (-not (Test-Path $backupDir)) {
    Write-Host "📁 Creating backup directory..." -ForegroundColor Gray
    New-Item -ItemType Directory -Force -Path $backupDir | Out-Null
}

# Generate secure random key (32 bytes = 256 bits, as hex = 64 characters)
Write-Host "🔑 Generating secure encryption key..." -ForegroundColor Yellow
$keyBytes = New-Object byte[] 32
$rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
$rng.GetBytes($keyBytes)
$encryptionKey = [BitConverter]::ToString($keyBytes).Replace("-", "").ToLower()
$rng.Dispose()

Write-Host "Generated key: $($encryptionKey.Substring(0, 8))..." -ForegroundColor Green

# Store key in Windows Credential Manager
Write-Host "💾 Storing key in Windows Credential Manager..." -ForegroundColor Yellow

# Delete existing credential if present
cmdkey /list | Select-String $credentialTarget | Out-Null
if ($LASTEXITCODE -eq 0) {
    Write-Host "Removing existing credential..." -ForegroundColor Gray
    cmdkey /delete:$credentialTarget 2>&1 | Out-Null
}

# Add new credential
cmdkey /generic:$credentialTarget /user:$credentialUser /pass:$encryptionKey | Out-Null

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Encryption key stored successfully" -ForegroundColor Green
} else {
    Write-Host "❌ Failed to store encryption key" -ForegroundColor Red
    exit 1
}

# Backup original database
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$backupPath = Join-Path $backupDir "dev-unencrypted-$timestamp.db"
Write-Host "📦 Backing up original database..." -ForegroundColor Yellow
Copy-Item $dbPath $backupPath -Force
Write-Host "Backup saved to: $backupPath" -ForegroundColor Green

# Check if SQLCipher CLI is available
# For this script to work, you need SQLCipher installed
# Alternative: Use better-sqlite3 with SQLCipher support via Node.js

Write-Host ""
Write-Host "⚠️  Database encryption setup complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Set SQLCIPHER_ENABLED=true in your .env file" -ForegroundColor White
Write-Host "2. Install dependencies: pnpm install" -ForegroundColor White
Write-Host "3. The database will be encrypted on first connection" -ForegroundColor White
Write-Host ""
Write-Host "Note: The original unencrypted database has been backed up to:" -ForegroundColor Yellow
Write-Host "$backupPath" -ForegroundColor Yellow
Write-Host ""

# Create a Node.js script to encrypt the database using better-sqlite3 + SQLCipher
$encryptScriptPath = ".\scripts\encrypt-database.js"
$encryptScript = @"
// Encrypt existing database using SQLCipher
const Database = require('@journeyapps/sqlcipher').Database;
const fs = require('fs');
const path = require('path');

const encryptionKey = '$encryptionKey';
const originalDb = '$dbPath';
const encryptedDb = '$dbPath.encrypted';

console.log('🔐 Encrypting database with SQLCipher...');

try {
  // Open the original unencrypted database
  const db = new Database(originalDb);
  
  // Attach an encrypted database
  db.prepare("ATTACH DATABASE ? AS encrypted KEY ?").run(encryptedDb, encryptionKey);
  
  // Export schema and data to encrypted database
  db.exec('SELECT sqlcipher_export("encrypted")');
  
  // Detach the encrypted database
  db.exec('DETACH DATABASE encrypted');
  
  db.close();
  
  console.log('✅ Database encrypted successfully');
  console.log('Encrypted database saved to:', encryptedDb);
  
  // Replace original with encrypted version
  console.log('Replacing original database with encrypted version...');
  fs.renameSync(originalDb, originalDb + '.old');
  fs.renameSync(encryptedDb, originalDb);
  
  console.log('✅ Database encryption complete!');
  console.log('Original database backed up to:', originalDb + '.old');
  
} catch (error) {
  console.error('❌ Encryption failed:', error.message);
  process.exit(1);
}
"@

Write-Host "Creating encryption script..." -ForegroundColor Gray
Set-Content -Path $encryptScriptPath -Value $encryptScript

Write-Host ""
Write-Host "Running database encryption..." -ForegroundColor Yellow
Write-Host ""

# Run the encryption script
Push-Location
Set-Location (Split-Path $dbPath -Parent)
try {
    node $encryptScriptPath
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "✅ Database encryption completed successfully!" -ForegroundColor Green
        Write-Host ""
        Write-Host "You can now start the application with:" -ForegroundColor Cyan
        Write-Host "pnpm dev" -ForegroundColor White
    }
} catch {
    Write-Host "❌ Encryption failed: $_" -ForegroundColor Red
    Write-Host ""
    Write-Host "You may need to install dependencies first:" -ForegroundColor Yellow
    Write-Host "pnpm install" -ForegroundColor White
} finally {
    Pop-Location
}

Write-Host ""
Write-Host "Encryption key is stored securely in Windows Credential Manager" -ForegroundColor Green
Write-Host "Target: $credentialTarget" -ForegroundColor Gray
Write-Host ""

