# Aviakul Finance ERP - Quick Setup Guide

## Prerequisites Check
Write-Host "=== Prerequisites Check ===" -ForegroundColor Cyan
Write-Host ""

# Check Node.js
Write-Host "Checking Node.js..." -NoNewline
try {
    $nodeVersion = node --version
    Write-Host " ✓ Found $nodeVersion" -ForegroundColor Green
}
catch {
    Write-Host " ✗ Not found" -ForegroundColor Red
    Write-Host "Please install Node.js from https://nodejs.org/" -ForegroundColor Yellow
    exit 1
}

# Check npm
Write-Host "Checking npm..." -NoNewline
try {
    $npmVersion = npm --version
    Write-Host " ✓ Found v$npmVersion" -ForegroundColor Green
}
catch {
    Write-Host " ✗ Not found" -ForegroundColor Red
    exit 1
}

# Check MongoDB
Write-Host "Checking MongoDB..." -NoNewline
try {
    $mongoResult = mongod --version 2>&1 | Select-String "version"
    if ($mongoResult) {
        Write-Host " ✓ Found" -ForegroundColor Green
    }
    else {
        Write-Host " ⚠ Not running" -ForegroundColor Yellow
        Write-Host "MongoDB should be running. Start it with: mongod" -ForegroundColor Yellow
    }
}
catch {
    Write-Host " ⚠ Not found or not in PATH" -ForegroundColor Yellow
    Write-Host "Install MongoDB from https://www.mongodb.com/try/download/community" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "=== Installation ===" -ForegroundColor Cyan
Write-Host ""

# Install dependencies
Write-Host "Installing dependencies (this may take a few minutes)..." -ForegroundColor Yellow
Write-Host ""

# Root dependencies
Write-Host "[1/3] Installing root dependencies..." -ForegroundColor Cyan
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "Failed to install root dependencies" -ForegroundColor Red
    exit 1
}

# Server dependencies
Write-Host ""
Write-Host "[2/3] Installing server dependencies..." -ForegroundColor Cyan
Set-Location server
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "Failed to install server dependencies" -ForegroundColor Red
    Set-Location ..
    exit 1
}
Set-Location ..

# Client dependencies
Write-Host ""
Write-Host "[3/3] Installing client dependencies..." -ForegroundColor Cyan
Set-Location client
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "Failed to install client dependencies" -ForegroundColor Red
    Set-Location ..
    exit 1
}
Set-Location ..

Write-Host ""
Write-Host "✓ All dependencies installed successfully!" -ForegroundColor Green
Write-Host ""

# Setup environment files
Write-Host "=== Environment Configuration ===" -ForegroundColor Cyan
Write-Host ""

# Server .env
if (!(Test-Path "server\.env")) {
    Write-Host "Creating server/.env from template..." -ForegroundColor Yellow
    Copy-Item "server\.env.example" "server\.env"
    Write-Host "✓ Created server/.env" -ForegroundColor Green
    Write-Host "⚠ Please edit server/.env and set your configuration!" -ForegroundColor Yellow
}
else {
    Write-Host "✓ server/.env already exists" -ForegroundColor Green
}

# Client .env
if (!(Test-Path "client\.env")) {
    Write-Host "Creating client/.env from template..." -ForegroundColor Yellow
    Copy-Item "client\.env.example" "client\.env"
    Write-Host "✓ Created client/.env" -ForegroundColor Green
}
else {
    Write-Host "✓ client/.env already exists" -ForegroundColor Green
}

Write-Host ""
Write-Host "=== Next Steps ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Make sure MongoDB is running:" -ForegroundColor White
Write-Host "   mongod" -ForegroundColor Gray
Write-Host ""
Write-Host "2. Seed the database:" -ForegroundColor White
Write-Host "   cd server" -ForegroundColor Gray
Write-Host "   npm run seed" -ForegroundColor Gray
Write-Host "   cd .." -ForegroundColor Gray
Write-Host ""
Write-Host "3. Start the application:" -ForegroundColor White
Write-Host "   npm run dev" -ForegroundColor Gray
Write-Host ""
Write-Host "4. Open your browser:" -ForegroundColor White
Write-Host "   http://localhost:3000" -ForegroundColor Gray
Write-Host ""
Write-Host "5. Login with default credentials:" -ForegroundColor White
Write-Host "   Username: superadmin" -ForegroundColor Gray
Write-Host "   Password: Admin@123456" -ForegroundColor Gray
Write-Host ""
Write-Host "⚠ IMPORTANT: Change the default password after first login!" -ForegroundColor Yellow
Write-Host ""
Write-Host "=== Setup Complete ===" -ForegroundColor Green
Write-Host ""
Write-Host "For detailed documentation, see README.md" -ForegroundColor Cyan
Write-Host ""
