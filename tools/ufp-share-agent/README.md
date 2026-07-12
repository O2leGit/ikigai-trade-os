# UFP PalletOneShare Fetch Agent

Keeps a local (and Google-Drive-visible) mirror of the customer-shared OneDrive folder
`KonsProjectShares/PalletOneShare` (owned by kchamp@ufpi.com, UFP tenant).

## Why this exists

Microsoft does not support the OneDrive **sync client** for guest/external accounts
("Sorry, OneDrive can't add your folder right now"), and the Graph API `/shares`
endpoint needs delegated permissions that UFP IT won't consent to. The only supported
guest access path is the **browser** — so this agent automates the browser:
a Playwright persistent profile holds the signed-in session, and an hourly scheduled
task downloads the share as a zip and mirrors it locally.

## Data flow

UFP OneDrive share → Playwright (your saved browser session) → zip →
`Documents\palletone-engagement\_ufp-share-mirror\` → Google Drive for Desktop backup
→ Google Drive cloud → readable by Claude via the Google Drive connector.

## Install (2 minutes)

1. Copy this folder to the desktop PC (or clone this branch).
2. In PowerShell, from this folder:
   `powershell -ExecutionPolicy Bypass -File .\install-ufp-share-agent.ps1`
3. A browser window opens — sign in as chris@cotoole.com (with MFA) and wait for the
   PalletOneShare folder to appear. The window closes itself; the session is saved.

That's it. The task `UFP-PalletOneShare-Fetch` pulls hourly from then on.

## Operations

- Log: `Documents\palletone-engagement\ufp-share-agent\agent.log`
- Session expired (log shows `AUTH_NEEDED`, typically after ~90 days or a password
  change): run `node fetch-ufp-share.mjs --login` from the agent folder once.
- Run on demand: Task Scheduler → `UFP-PalletOneShare-Fetch` → Run, or
  `powershell -File run-sync.ps1`.
- Uninstall: `Unregister-ScheduledTask -TaskName 'UFP-PalletOneShare-Fetch'` and
  delete the agent folder.

## Notes

- One-way inbound: the UFP share is never written to; `robocopy /MIR` prunes only the
  local mirror.
- This automates Chris's own granted access with his own signed-in session — the same
  actions as clicking Download in the browser, on a schedule.
