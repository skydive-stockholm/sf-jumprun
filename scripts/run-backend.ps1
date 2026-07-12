# Supervisor loop for the SF Jump Run backend.
# Restarts the backend automatically if it ever exits (crash, killed, etc.).
# Used by the Scheduled Task created by install-autostart.ps1.

$ErrorActionPreference = 'Continue'
$projectRoot = Split-Path -Parent $PSScriptRoot
Set-Location $projectRoot

while ($true) {
    Write-Host "[$(Get-Date -Format o)] Starting backend..."
    try {
        npm run backend:prod
    } catch {
        Write-Host "[$(Get-Date -Format o)] Backend threw: $_"
    }
    Write-Host "[$(Get-Date -Format o)] Backend exited. Restarting in 3s..."
    Start-Sleep -Seconds 3
}
