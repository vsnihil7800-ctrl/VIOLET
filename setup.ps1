# Violet AI Personal Assistant - Developer Setup & Launcher Utility

$ErrorActionPreference = "Stop"

Write-Host "==============================================" -ForegroundColor Cyan
Write-Host "   Violet AI Personal Assistant Setup Board   " -ForegroundColor Cyan
Write-Host "==============================================" -ForegroundColor Cyan

# 1. Check prerequisites
Write-Host "[1/3] Auditing prerequisites..." -ForegroundColor Yellow
if (-not (Get-Command python -ErrorAction SilentlyContinue)) {
    Write-Error "Python is not installed or not in PATH."
}
if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
    Write-Error "Node.js/npm is not installed or not in PATH."
}
Write-Host "Prerequisites satisfied." -ForegroundColor Green

# 2. Setup backend virtual environment
Write-Host "[2/3] Configuring Python backend virtual environment..." -ForegroundColor Yellow
cd backend
if (-not (Test-Path venv)) {
    Write-Host "Creating Python venv..." -ForegroundColor Gray
    python -m venv venv
}

Write-Host "Installing backend dependencies (pip)..." -ForegroundColor Gray
.\venv\Scripts\python.exe -m pip install --upgrade pip
.\venv\Scripts\pip.exe install -r requirements.txt
.\venv\Scripts\pip.exe install pytest httpx pillow
cd ..

# 3. Setup frontend packages
Write-Host "[3/3] Installing frontend packages (npm)..." -ForegroundColor Yellow
cd frontend
Write-Host "Installing node packages..." -ForegroundColor Gray
npm install
cd ..

Write-Host "`nSetup Completed Successfully!" -ForegroundColor Green
Write-Host "==============================================" -ForegroundColor Cyan

# Interactive Developer Menu
while ($true) {
    Write-Host "`nSelect an action:" -ForegroundColor Yellow
    Write-Host "1) Run Development Servers (Backend & Frontend concurrently)"
    Write-Host "2) Execute Pytest Unit Tests"
    Write-Host "3) Verify Frontend Client Build Compilation"
    Write-Host "4) Build and Run with Docker Compose"
    Write-Host "q) Exit Launcher"
    
    $choice = Read-Host "`nEnter option [1-4, q]"
    
    switch ($choice) {
        "1" {
            Write-Host "`nStarting dev environment servers..." -ForegroundColor Cyan
            # Launch backend in a new window
            Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd backend; .\venv\Scripts\activate; uvicorn app.main:app --reload --port 8000"
            # Launch frontend in a new window
            Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd frontend; npm run dev"
            Write-Host "Backend running on http://localhost:8000" -ForegroundColor Green
            Write-Host "Frontend running on http://localhost:5173" -ForegroundColor Green
        }
        "2" {
            Write-Host "`nExecuting backend test cases..." -ForegroundColor Cyan
            cd backend
            .\venv\Scripts\python.exe -m pytest
            cd ..
        }
        "3" {
            Write-Host "`nVerifying client build compilation..." -ForegroundColor Cyan
            cd frontend
            npm run build
            cd ..
        }
        "4" {
            if (-not (Get-Command docker-compose -ErrorAction SilentlyContinue)) {
                Write-Host "docker-compose is not installed or not in PATH." -ForegroundColor Red
            } else {
                Write-Host "`nBuilding and booting Docker Compose containers..." -ForegroundColor Cyan
                docker-compose up --build
            }
        }
        "q" {
            Write-Host "Exiting. Happy coding!" -ForegroundColor Green
            break
        }
        Default {
            Write-Host "Invalid option. Please choose 1, 2, 3, 4, or q." -ForegroundColor Red
        }
    }
}
