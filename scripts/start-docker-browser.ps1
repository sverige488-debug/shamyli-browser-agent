$ErrorActionPreference = "Stop"

$Root = Split-Path -Parent $PSScriptRoot
$FrontendDir = Join-Path $Root "frontend"
$ComposeFile = Join-Path $Root "docker-compose.local-agent.yml"

if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    throw "Docker Desktop / docker was not found in PATH."
}
if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
    throw "npm was not found in PATH. Run .\scripts\setup-windows.ps1 first."
}
if (-not (Test-Path (Join-Path $FrontendDir "node_modules"))) {
    throw "Frontend dependencies are not installed yet. Run .\scripts\setup-windows.ps1 first."
}

Set-Location $Root
Write-Host "Starting Browser Use + reused noVNC stack..." -ForegroundColor Cyan
& docker compose -f $ComposeFile up --build -d

Write-Host "Waiting for local adapter health..." -ForegroundColor Cyan
$Healthy = $false
for ($i = 0; $i -lt 60; $i++) {
    try {
        $Response = Invoke-WebRequest -UseBasicParsing -Uri "http://127.0.0.1:8000/health" -TimeoutSec 2
        if ($Response.StatusCode -eq 200) {
            $Healthy = $true
            break
        }
    } catch {
        Start-Sleep -Seconds 2
    }
}

if (-not $Healthy) {
    & docker compose -f $ComposeFile logs --tail 120
    throw "Local adapter did not become healthy. Docker logs are shown above."
}

$FrontendCommand = "Set-Location '$FrontendDir'; npm run dev -- --hostname 127.0.0.1 --port 3000"
Start-Process powershell -ArgumentList "-NoExit", "-Command", $FrontendCommand | Out-Null
Start-Sleep -Seconds 4
Start-Process "http://127.0.0.1:3000"

Write-Host "" 
Write-Host "SHAMYLI UI: http://127.0.0.1:3000" -ForegroundColor Green
Write-Host "Local API:  http://127.0.0.1:8000" -ForegroundColor Green
Write-Host "noVNC:      http://127.0.0.1:6080" -ForegroundColor Green
Write-Host "VNC password defaults to 'shamyli-local' unless VNC_PASSWORD is set."
Write-Host "Stop Docker backend: docker compose -f docker-compose.local-agent.yml down"
