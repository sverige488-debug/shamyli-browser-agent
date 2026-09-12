$ErrorActionPreference = "Stop"

$Root = Split-Path -Parent $PSScriptRoot
$BackendPython = Join-Path $Root "local_backend\.venv\Scripts\python.exe"
$BackendApp = Join-Path $Root "local_backend\app.py"
$FrontendDir = Join-Path $Root "frontend"

if (-not (Test-Path $BackendPython)) {
    throw "Local backend is not installed yet. Run .\scripts\setup-windows.ps1 first."
}
if (-not (Test-Path (Join-Path $FrontendDir "node_modules"))) {
    throw "Frontend dependencies are not installed yet. Run .\scripts\setup-windows.ps1 first."
}

$BackendCommand = "& '$BackendPython' '$BackendApp'"
$FrontendCommand = "Set-Location '$FrontendDir'; npm run dev -- --hostname 127.0.0.1 --port 3000"

Write-Host "Starting SHAMYLI Browser Agent locally..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", $BackendCommand | Out-Null
Start-Sleep -Seconds 2
Start-Process powershell -ArgumentList "-NoExit", "-Command", $FrontendCommand | Out-Null
Start-Sleep -Seconds 4
Start-Process "http://127.0.0.1:3000"

Write-Host "UI:      http://127.0.0.1:3000" -ForegroundColor Green
Write-Host "Backend: http://127.0.0.1:8000" -ForegroundColor Green
Write-Host "Both services are bound to this PC only."
