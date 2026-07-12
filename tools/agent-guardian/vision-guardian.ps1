# Vision-side half of the Jarvis<->Vision mutual watchdog.
#
# Runs on Sir's Windows desktop. Invoked every hour by the already-proven-alive
# UFP-PalletOneShare-Fetch task (see ufp-share-agent/run-sync.ps1), so it needs no
# separate scheduler to stay alive — it rides the one desktop task we know fires.
#
# Three jobs each run:
#   1. HEARTBEAT  - stamp that Vision's host is alive, into a Google-Drive-synced
#                   file that Jarvis (VPS) can read via its gdrive: rclone remote.
#   2. SELF-HEAL  - if Vision's poller is not running, restart it. Requires the
#                   launch command recorded by the persistence task (vision-launch.cmd);
#                   until that exists this step is a no-op (heartbeat+check still run).
#   3. CHECK PEER - read Jarvis's heartbeat (synced down from the same Drive account);
#                   if stale > 30 min, log a DEGRADED line for the next brief to surface.

$ErrorActionPreference = 'SilentlyContinue'
$HB   = Join-Path $env:USERPROFILE 'Documents\palletone-engagement\agent-heartbeats'
$Base = Join-Path $env:USERPROFILE 'Documents\palletone-engagement\agent-guardian'
New-Item -ItemType Directory -Force -Path $HB, $Base | Out-Null
$log = Join-Path $Base 'guardian.log'
function Note($m) { Add-Content $log "[$([DateTime]::UtcNow.ToString('o'))] $m" }

# 1. HEARTBEAT — Vision is alive
$stamp = [DateTimeOffset]::UtcNow.ToUnixTimeSeconds()
Set-Content (Join-Path $HB 'vision.heartbeat') "$stamp $env:COMPUTERNAME vision-alive"

# 2. SELF-HEAL — restart the Vision poller if the persistence task recorded how
$launchFile = Join-Path $Base 'vision-launch.cmd'
$markerFile = Join-Path $Base 'vision-proc-marker.txt'
if ((Test-Path $launchFile) -and (Test-Path $markerFile)) {
    $marker = (Get-Content $markerFile -Raw).Trim()
    $alive = Get-CimInstance Win32_Process |
             Where-Object { $_.CommandLine -and $_.CommandLine -like "*$marker*" }
    if (-not $alive) {
        $launch = (Get-Content $launchFile -Raw).Trim()
        Note "Vision poller not found (marker=$marker) — restarting: $launch"
        Start-Process -WindowStyle Hidden -FilePath 'cmd.exe' -ArgumentList '/c', $launch
    }
} else {
    Note 'launch/marker not yet recorded — heartbeat+peer-check only (run the persistence task once Vision is up)'
}

# 3. CHECK PEER — is Jarvis's heartbeat fresh? (written by the VPS guardian into the same Drive account)
$jarvisHB = Join-Path $HB 'jarvis.heartbeat'
if (Test-Path $jarvisHB) {
    $jstamp = [int64]((Get-Content $jarvisHB -Raw).Trim().Split(' ')[0])
    $age = $stamp - $jstamp
    if ($age -gt 1800) { Note "PEER DEGRADED: Jarvis heartbeat stale ${age}s (>30m). VPS worker may be down." }
} else {
    Note 'Jarvis heartbeat not yet present (VPS guardian not installed or Drive account mismatch)'
}
