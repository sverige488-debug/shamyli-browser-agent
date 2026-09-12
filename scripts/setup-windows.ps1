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

$VenvDir = Join-Path $Root "local_backend\.venv"
$VenvScripts = Join-Path $VenvDir "Scripts"
$VenvPython = Join-Path $VenvScripts "python.exe"
$BrowserUseExe = Join-Path $VenvScripts "browser-use.exe"

if (-not (Test-Path $VenvPython)) {
    & python -m venv $VenvDir
}

& $VenvPython -m pip install --upgrade pip
& $VenvPython -m pip install -r (Join-Path $Root "local_backend\requirements.txt")

# Browser Use's official `browser-use install` command invokes `uvx`.
# Install uv into the same venv and expose that Scripts directory while the
# official installer runs; do not replace Browser Use's installation logic.
& $VenvPython -m pip install uv
$OldPath = $env:PATH
$env:PATH = "$VenvScripts;$env:PATH"
try {
    Write-Host "Installing Browser Use Chromium..." -ForegroundColor Cyan
    & $BrowserUseExe install
} finally {
    $env:PATH = $OldPath
}

Push-Location (Join-Path $Root "frontend")
try {
    & npm install --no-audit --no-fund
} finally {
    Pop-Location
}

Write-Host ""
Write-Host "Setup complete." -ForegroundColor Green
Write-Host "Run: .\scripts\start-windows.ps1"
