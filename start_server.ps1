# GRIDSEC Server Startup Script for PowerShell
Write-Host "===================================================" -ForegroundColor Cyan
Write-Host "  GRIDSEC - Power Grid Resilience Platform" -ForegroundColor Cyan
Write-Host "  Starting Server on http://127.0.0.1:8000" -ForegroundColor Cyan
Write-Host "===================================================" -ForegroundColor Cyan

# Ensure project character assets exist in assets/images
$imgDir = Join-Path $PSScriptRoot "assets\images"
if (-not (Test-Path $imgDir)) { New-Item -ItemType Directory -Path $imgDir -Force | Out-Null }
$opSrc = "C:\Users\karti\.gemini\antigravity-ide\brain\d2622f27-4d61-406f-933f-22fef3b2aff9\.user_uploaded\media_1792763553226.png"
$hkSrc = "C:\Users\karti\.gemini\antigravity-ide\brain\d2622f27-4d61-406f-933f-22fef3b2aff9\.user_uploaded\media_1792763583932.png"
if ((Test-Path $opSrc) -and (-not (Test-Path "$imgDir\grid_operator.png"))) {
    Copy-Item $opSrc "$imgDir\grid_operator.png" -Force
}
if ((Test-Path $hkSrc) -and (-not (Test-Path "$imgDir\hacker.png"))) {
    Copy-Item $hkSrc "$imgDir\hacker.png" -Force
}

$pythonCmd = "python"
if (-not (Get-Command python -ErrorAction SilentlyContinue)) {
    if (Get-Command py -ErrorAction SilentlyContinue) {
        $pythonCmd = "py"
    } else {
        Write-Host "[ERROR] Python was not found on your system PATH." -ForegroundColor Red
        Write-Host "Please install Python 3.10+ or open 'app.html' directly in your browser." -ForegroundColor Yellow
        exit 1
    }
}

# Check minimal required packages
& $pythonCmd -c "import uvicorn, fastapi" 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Host "[INFO] Installing minimal server dependencies (fastapi, uvicorn, sqlalchemy)..." -ForegroundColor Yellow
    & $pythonCmd -m pip install fastapi "uvicorn[standard]" sqlalchemy pydantic python-dotenv requests websockets
}

Write-Host "Launching server via $pythonCmd backend\run_server.py..." -ForegroundColor Green
& $pythonCmd backend\run_server.py
