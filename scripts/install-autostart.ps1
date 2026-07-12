# Registers a Windows Scheduled Task that runs the SF Jump Run backend at logon
# and keeps it running. Combined with BIOS "restore on AC power" + Windows
# auto-login (see RESILIENCE.md), the app comes back automatically after a
# power cut.
#
# Run once, from an elevated PowerShell:
#   pwsh -ExecutionPolicy Bypass -File scripts\install-autostart.ps1

$ErrorActionPreference = 'Stop'

$taskName = 'SF JumpRun'
$projectRoot = Split-Path -Parent $PSScriptRoot
$runScript = Join-Path $projectRoot 'scripts\run-backend.ps1'

$action = New-ScheduledTaskAction `
    -Execute 'pwsh.exe' `
    -Argument "-ExecutionPolicy Bypass -WindowStyle Hidden -File `"$runScript`"" `
    -WorkingDirectory $projectRoot

# Fire at logon so it survives reboots, and re-arm at boot as a safety net.
$triggerLogon = New-ScheduledTaskTrigger -AtLogOn
$triggerBoot = New-ScheduledTaskTrigger -AtStartup

# Restart if the task ends, never stop it, and don't kill it on battery.
$settings = New-ScheduledTaskSettingsSet `
    -AllowStartIfOnBatteries `
    -DontStopIfGoingOnBatteries `
    -RestartCount 999 `
    -RestartInterval (New-TimeSpan -Minutes 1) `
    -ExecutionTimeLimit (New-TimeSpan -Seconds 0) `
    -StartWhenAvailable

Register-ScheduledTask `
    -TaskName $taskName `
    -Action $action `
    -Trigger @($triggerLogon, $triggerBoot) `
    -Settings $settings `
    -RunLevel Highest `
    -Force

Write-Host "Scheduled Task '$taskName' installed."
Write-Host "Start it now with:  Start-ScheduledTask -TaskName '$taskName'"
