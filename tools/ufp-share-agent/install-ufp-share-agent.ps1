# One-time installer for the UFP PalletOneShare fetch agent.
# Run from the folder containing fetch-ufp-share.mjs and run-sync.ps1:
#   powershell -ExecutionPolicy Bypass -File .\install-ufp-share-agent.ps1

$ErrorActionPreference = 'Stop'
$Base = Join-Path $env:USERPROFILE 'Documents\palletone-engagement\ufp-share-agent'
New-Item -ItemType Directory -Force -Path $Base | Out-Null

# 1) Node.js
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host 'Node.js not found - installing via winget...'
    winget install --id OpenJS.NodeJS.LTS -e --silent --accept-package-agreements --accept-source-agreements
    $env:Path = [Environment]::GetEnvironmentVariable('Path', 'Machine') + ';' +
                [Environment]::GetEnvironmentVariable('Path', 'User')
}

# 2) Agent files (installer expects them next to itself)
Copy-Item -Path (Join-Path $PSScriptRoot 'fetch-ufp-share.mjs') -Destination $Base -Force
Copy-Item -Path (Join-Path $PSScriptRoot 'run-sync.ps1')        -Destination $Base -Force

# 3) Playwright + Chromium
Set-Location $Base
if (-not (Test-Path package.json)) { npm init -y | Out-Null }
npm install playwright | Out-Null
npx playwright install chromium

# 4) Scheduled task - hourly pull
$action  = New-ScheduledTaskAction -Execute 'powershell.exe' `
           -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$Base\run-sync.ps1`""
$trigger = New-ScheduledTaskTrigger -Once -At (Get-Date).AddMinutes(5) `
           -RepetitionInterval (New-TimeSpan -Hours 1)
Register-ScheduledTask -TaskName 'UFP-PalletOneShare-Fetch' -Action $action -Trigger $trigger -Force | Out-Null
Write-Host 'Scheduled task UFP-PalletOneShare-Fetch registered (hourly).'

# 5) One-time interactive sign-in (needs a human at the keyboard for MFA)
Write-Host 'Opening browser for the one-time Microsoft sign-in...'
node .\fetch-ufp-share.mjs --login
Write-Host "Done. The agent now pulls the UFP share hourly into Documents\palletone-engagement\_ufp-share-mirror"
