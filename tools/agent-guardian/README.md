# Jarvis ↔ Vision Mutual Watchdog

Keeps Sir's two always-on agents — **Jarvis** (VPS) and **Vision** (Windows desktop
worker, a.k.a. `claude-code-desktop`) — monitoring, heartbeating, and restarting each
other, so neither silently dies the way Vision did on 2026-07-04.

## Why a peer watchdog (and its one hard limit)

The Jarvis command queue is **pull-based**: Vision polls it. So a *dead* Vision cannot
receive a "restart yourself" command — that path is circular. And Jarvis (VPS) cannot
Wake-on-LAN the desktop across the internet boundary (WoL needs a controller on the same
LAN). Therefore **the very first start of a fully-offline Vision is the one action that
requires a human** (or a Windows logon auto-start task, which the persistence step
installs). Everything after that first start is automated by the design below.

## Design (restart, not just detect)

Shared channel = a folder in Sir's Google Drive both agents already reach:
`Documents/palletone-engagement/agent-heartbeats/` on the desktop === `gdrive:` remote on
the VPS. Each agent writes its own `*.heartbeat` (unix-ts) and reads the other's.

| Direction | Mechanism | Action on failure |
|-----------|-----------|-------------------|
| Jarvis → Vision | `vision-deadman.sh` (VPS cron, 2h) reads Vision's heartbeat / queue-claim age | Telegram alert to Sir: "Vision offline" |
| Vision → Jarvis | `vision-guardian.ps1` (desktop, hourly via the UFP task) reads Jarvis's heartbeat | logs `PEER DEGRADED` for the brief |
| Vision self-heal | `vision-guardian.ps1` restarts the poller if its process marker is absent | auto-restart, no human |
| Jarvis self-heal | systemd/cron `@reboot` + `queue-liveness-deadman` (already installed) | auto-restart on boot |

The desktop guardian **rides the UFP-PalletOneShare-Fetch task** — the one desktop task
proven to fire hourly on its own — so Vision's watchdog needs no scheduler of its own.

## Files

- `vision-guardian.ps1` — desktop half; called at the end of `ufp-share-agent/run-sync.ps1`.
- `vision-launch.cmd` / `vision-proc-marker.txt` — written by the persistence task once
  Vision is first online; they tell the guardian *how* to start Vision and *how* to tell
  it's running. Until they exist, the guardian heartbeats and peer-checks but does not
  restart.

## VPS side

Lives in the jarvis-core repo / VPS scripts (not this repo). Installed via Jarvis queue
commands: `jarvis-heartbeat` writer + `vision-deadman` reader, both on cron, plus
`@reboot` persistence for the poller.
