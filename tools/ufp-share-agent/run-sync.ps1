# Runs the fetcher, then unpacks the zip and mirrors it into the engagement folder.
# The mirror lives under Documents\palletone-engagement, which Google Drive for
# Desktop already backs up - so the files become visible to cloud Claude via the
# Google Drive connector within minutes of each run.

$Base   = Join-Path $env:USERPROFILE 'Documents\palletone-engagement\ufp-share-agent'
$Mirror = Join-Path $env:USERPROFILE 'Documents\palletone-engagement\_ufp-share-mirror'
$Zip    = Join-Path $Base 'latest-download.zip'
$Stage  = Join-Path $Base 'stage'
$Log    = Join-Path $Base 'agent.log'

Set-Location $Base
node .\fetch-ufp-share.mjs
if ($LASTEXITCODE -ne 0) {
    Add-Content $Log "[$(Get-Date -Format o)] fetch exited $LASTEXITCODE - mirror skipped"
    exit $LASTEXITCODE
}

if (Test-Path $Stage) { Remove-Item $Stage -Recurse -Force }
Expand-Archive -Path $Zip -DestinationPath $Stage -Force
New-Item -ItemType Directory -Force -Path $Mirror | Out-Null

# /MIR prunes only the local mirror to match the share; the UFP source is never touched.
robocopy $Stage $Mirror /MIR /R:2 /W:5 /NP /LOG+:$Log | Out-Null
Add-Content $Log "[$(Get-Date -Format o)] MIRROR OK -> $Mirror"
exit 0
