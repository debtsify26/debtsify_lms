# Debtsify Backend Setup Script
# Run this script to set up the backend environment

Write-Host "======================================" -ForegroundColor Cyan
Write-Host "  Debtsify Backend Setup" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""

# Check Python version
Write-Host "[1/6] Checking Python installation..." -ForegroundColor Yellow
try {
    $pythonVersion = python --version 2>&1
    Write-Host "✓ Found: $pythonVersion" -ForegroundColor Green
} catch {
    Write-Host "✗ Python not found! Please install Python 3.10 or higher." -ForegroundColor Red
    exit 1
}

# Create virtual environment
Write-Host ""
Write-Host "[2/6] Creating virtual environment..." -ForegroundColor Yellow
if (Test-Path "venv") {
    Write-Host "✓ Virtual environment already exists" -ForegroundColor Green
} else {
    python -m venv venv
    Write-Host "✓ Virtual environment created" -ForegroundColor Green
}

# Activate virtual environment
Write-Host ""
Write-Host "[3/6] Activating virtual environment..." -ForegroundColor Yellow
& .\venv\Scripts\Activate.ps1
Write-Host "✓ Virtual environment activated" -ForegroundColor Green

# Install dependencies
Write-Host ""
Write-Host "[4/6] Installing dependencies..." -ForegroundColor Yellow
pip install -r requirements.txt
Write-Host "✓ Dependencies installed" -ForegroundColor Green

# Create .env file if it doesn't exist
Write-Host ""
Write-Host "[5/6] Setting up environment file..." -ForegroundColor Yellow
if (Test-Path ".env") {
    Write-Host "✓ .env file already exists" -ForegroundColor Green
} else {
    Copy-Item ".env.example" ".env"
    Write-Host "✓ Created .env file from template" -ForegroundColor Green
    Write-Host ""
    Write-Host "⚠️  IMPORTANT: Edit .env file and add your credentials!" -ForegroundColor Yellow
    Write-Host "   - SUPABASE_URL" -ForegroundColor Yellow
    Write-Host "   - SUPABASE_KEY" -ForegroundColor Yellow
    Write-Host "   - SUPABASE_SERVICE_KEY" -ForegroundColor Yellow
    Write-Host "   - SECRET_KEY (generate with: python -c 'import secrets; print(secrets.token_hex(32))')" -ForegroundColor Yellow
}

# Generate SECRET_KEY
Write-Host ""
Write-Host "[6/6] Generating SECRET_KEY..." -ForegroundColor Yellow
$secretKey = python -c "import secrets; print(secrets.token_hex(32))"
Write-Host "✓ Generated SECRET_KEY: $secretKey" -ForegroundColor Green
Write-Host ""
Write-Host "Copy this key to your .env file:" -ForegroundColor Cyan
Write-Host "SECRET_KEY=$secretKey" -ForegroundColor White

Write-Host ""
Write-Host "======================================" -ForegroundColor Cyan
Write-Host "  Setup Complete!" -ForegroundColor Green
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Create a Supabase project at https://supabase.com" -ForegroundColor White
Write-Host "2. Run the SQL from schema.sql in Supabase SQL Editor" -ForegroundColor White
Write-Host "3. Update .env with your Supabase credentials" -ForegroundColor White
Write-Host "4. Run: python main.py" -ForegroundColor White
Write-Host ""
