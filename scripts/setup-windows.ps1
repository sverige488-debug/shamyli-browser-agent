$ErrorActionPreference = "Stop"

$Root = Split-Path -Parent $PSScriptRoot
Set-Location $Root

Write-Host "SHAMYLI Browser Agent - local setup" -ForegroundColor Cyan

if (-not (Get-Command python -ErrorAction SilentlyContinue)) {
    throw "Python 3.11+ was not found in PATH."
}
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    throw "Node.js 20+ was not found in PATH."
}
if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
    throw "npm was not found in PATH."
}

$PythonVersion = & python -c "import sys; print(f'{sys.version_info.major}.{sys.version_info.minor}')"
Write-Host "Python $PythonVersion"
Write-Host "Node $(& node --version)"

$VenvPython = Join-Path $Root "local_backend\.venv\Scripts\python.exe"
$BrowserUseExe = Join-Path $Root "local_backend\.venv\Scripts\browser-use.exe"

if (-not (Test-Path $VenvPython)) {
    & python -m venv (Join-Path $Root "local_backend\.venv")
}

& $VenvPython -m pip install --upgrade pip
& $VenvPython -m pip install -r (Join-Path $Root "local_backend\requirements.txt")

Write-Host "Installing Browser Use Chromium..." -ForegroundColor Cyan
& $BrowserUseExe install

Push-Location (Join-Path $Root "frontend")
try {
    & npm install --no-audit --no-fund
} finally {
    Pop-Location
}

Write-Host ""
Write-Host "Setup complete." -ForegroundColor Green
Write-Host "Run: .\scripts\start-windows.ps1"
