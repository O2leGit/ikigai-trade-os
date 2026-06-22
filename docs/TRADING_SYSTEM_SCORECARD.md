# UTP Trading System — Production Readiness & Profitability Scorecard

> Generated: 2026-06-21 (Sunday, pre-Monday-open review)
> Scope: unified-trading-platform (UTP) backend on the VPS + this cockpit frontend.
> Evidence: runtime probes & DB/JSONL audits (Jarvis worker commands 247–256, 262).
> Method: every grade is backed by a measured fact, not an assumption.

---

## Overall grade: **D+ — NOT production-ready**

The system has strong *bones* (kill-switch, circuit breakers, autonomy framework,
a faithful live cockpit) but is currently **not trading and not recording reliably**:

- The **only** engine that ever recorded end-to-end trades (`helios_etf_orb`) has been
  **dark for 10 days** (last trade 2026-06-11).
- **Zero** order/fill lifecycle events fleet-wide for 10 days across all 20 engines.
- **11 live broker positions** are unreconciled (exist at the broker, never recorded locally).
- **Schwab broker token expired ~21 days ago** → 15 of 18 engines cannot trade.
- **Helios silently reverted from live → paper** on the **2026-06-13 12:13 UTC container rebuild**: the live flag was set **in memory only** (via `POST /api/alpaca/mode`, never persisted to `.env`, which always held `ALPACA_PAPER=true`), so the rebuild booted back to paper and the runtime-injected live keys were destroyed with the old container.

None of this surfaced an alert. That is the core failure: the system *looked* green while silently idle.

---

## Dimension scorecard

| # | Dimension | Weight | Grade | One-line basis |
|---|-----------|:------:|:-----:|----------------|
| 1 | Trade Execution & Recording | 20% | **D** | Only 1 engine ever recorded; dark 10d; 0 order/fill events fleet-wide; `strategy_events` table empty |
| 2 | Broker Connectivity & Readiness | 15% | **D-** | Schwab token dead 21d; Helios live keys wiped → reverted to paper |
| 3 | Strategy Performance & Backtest-vs-Live | 15% | **D+** | Only 4 genuinely live trades ever (Jun 4–11; 20 prior were paper); no live-vs-backtest reconciliation; profitability unproven |
| 4 | Portfolio & Risk Management | 15% | **C-** | Kill-switch + circuit breakers good; but 11 orphan positions = portfolio not coherently tracked |
| 5 | Observability, Alerting & Self-Healing | 15% | **C-** | Pre-open sweep exists but shallow + Discord-only; token expiry never paged; app has no Docker healthcheck |
| 6 | Dashboard / Cockpit | 10% | **B** | Solid live-polling UI (Helios light, engines, kill-switch, Schwab badge); build verification pending |
| 7 | Governance & Safety | 10% | **C+** | Live gate + masked secrets + kill-switch; idempotency field exists but unused (DB path dead) |

---

## Dimension detail — evidence, gap, path to A+

### 1. Trade Execution & Recording — **D**
- **Evidence:** `public.trades` = 24 rows, all `helios_etf_orb`, last 2026-06-11. `public.signals` = 36, all Helios. `public.strategy_events` = **0 rows** (intended DB persistence path never written). JSONL shows `order_submitted`/`order_filled`/`fill` = **0 across all 20 engines, 10 days**. `swing_aplus` emitted 575 `signal_accepted` but 0 orders (shadow-only).
- **Gap:** Signals are generated but never become recorded orders; the DB audit trail is effectively dead.
- **To A+:** (a) restore the `strategy_events` DB writer; (b) emit `order_submitted`/`order_filled` on every order with an idempotency key; (c) nightly reconcile broker fills ↔ `public.trades` and alert on mismatch.

### 2. Broker Connectivity & Readiness — **D-**
- **Evidence:** `/api/schwab/status` → `connected:false`, token expired ~21 days. Helios on `paper-api.alpaca.markets` (Alpaca server-side `paper:true`), `ALPACA_LIVE_KEY`/`SECRET` slots empty.
- **Gap:** No automated token-expiry paging; live keys not persisted across rebuilds.
- **To A+:** (a) **[USER]** re-auth Schwab OAuth; (b) **[USER]** re-supply live Alpaca keys; (c) persist keys in a secret store (Vault) so a rebuild can't wipe them; (d) deep token-readiness check that pages Telegram ≥48h before expiry.

### 3. Strategy Performance & Backtest-vs-Live — **D+**
- **Evidence:** Only **4 genuinely live trades** ever (SPY/XLI, Jun 4–11; the 20 prior were paper); the live mode was set in-memory only and lost on the Jun 13 container rebuild. No backtest-vs-live tracking-error monitor in place.
- **Gap:** Profitability is unproven; no overfitting / deflated-Sharpe guardrails; live degradation invisible.
- **To A+:** stand up a backtest-vs-live reconciliation report per engine (expected vs realized Sharpe/win-rate/slippage), with a promotion gate before any engine moves observe→suggest→act. (See research brief, folded in below when complete.)

### 4. Portfolio & Risk Management — **C-**
- **Evidence:** Kill-switch off & clear; 3 circuit breakers closed; autonomy levels enforced (2 act / 1 suggest / 15 observe). **But** reconciliation reports `broker_only=11` daily — 11 real positions (AAPL, IWM, GOOGL LEAPS ×4, DIA/SPY puts ×4) with no local record.
- **Gap:** No single source of truth for portfolio exposure; orphan positions = un-risk-managed.
- **To A+:** reconcile & adopt orphan positions into the ledger; add portfolio-level gross/net exposure + correlation caps; daily drawdown monitor with auto-deleverage.

### 5. Observability, Alerting & Self-Healing — **C-**
- **Evidence:** `premarket_health_sweep` (05:30 CT Mon-Fri) exists but only checks broker *reachability*, not token *validity*, and posts Discord-only. Telegram mirrors `critical`+`emergency` only. App container has **no Docker healthcheck**; `utp-autoheal-1` shows cosmetically unhealthy.
- **Gap:** The exact failures we hit (token expiry, engine going dark, silent paper-reversion) produced **no page**.
- **To A+:** (a) deep token/liveness checks routed to `critical` → Telegram; (b) "engine went dark" dead-man (no trades/events in N hours during market) → page; (c) Docker healthcheck on app so autoheal catches hangs; (d) escalating re-auth ladder (Day-5 warn → Day-6 critical → emergency repeat).

### 6. Dashboard / Cockpit — **B**
- **Evidence:** `client/src/pages/Engines.tsx` polls `/api/helios/status` (5s), `/api/engines`, renders traffic-light, KPI cards, Schwab badge, kill-switch confirm, per-engine enable/pause/scan, and a clear UTP-unreachable error state. Faithfully reflects backend truth.
- **Gap:** Needs a live-vs-paper banner + "last trade age" + orphan-position widget so the silent-idle condition is visible at a glance; build/test verification pending in this environment.
- **To A+:** add a prominent MODE (LIVE/PAPER) + freshness banner driven by `/api/health` + last-trade timestamp.

### 7. Governance & Safety — **C+**
- **Evidence:** Live cutover required `ALPACA_PAPER=false` + a confirm flag + live keys (good gate). Secrets masked in all probes. `dedupe_key` column exists for idempotency.
- **Gap:** Idempotency unused (DB event path dead); the live config silently regressed with no change-control alarm.
- **To A+:** config-drift detection (alarm when `ALPACA_PAPER` or key presence changes between restarts); wire idempotency keys once the event writer is restored.

---

## Critical findings (fix-first)

| P | Finding | Owner | Blocks Monday? |
|:-:|---------|-------|:--------------:|
| P0 | Helios live keys wiped → reverted to paper; engine dark 10d | **USER** (supply live keys) + me (flip) | Yes (for live) |
| P0 | Schwab token expired 21d → 15 engines can't trade | **USER** (OAuth re-auth) | Yes |
| P1 | Order/fill events not recorded fleet-wide; `strategy_events` empty | me (VPS code) | Recording only |
| P1 | 11 orphan broker positions unreconciled | me (reconcile) + USER (review) | Risk |
| P1 | No alert fired for any of the above | me (deep checks + Telegram paging) | Prevents recurrence |
| P2 | App container has no Docker healthcheck; autoheal cosmetic | me (compose) | No |

---

## Path to A+ before Monday open — honest assessment

**Achievable by me this weekend (no trading-logic changes, reliability only):**
- Deep Schwab-token + Helios-mode readiness checks → Telegram paging.
- "Engine went dark" dead-man alert.
- Docker healthcheck on the app container; autoheal cosmetic fix.
- Orphan-position reconciliation report; restore the `strategy_events` writer + order/fill emission.
- Config-drift alarm so a rebuild can never silently flip live→paper again.
- Cockpit MODE + freshness banner.

**Requires YOU (cannot be done without you):**
1. **Re-supply live Alpaca API key + secret** → I flip `ALPACA_PAPER=false` and Helios is live again.
2. **Schwab OAuth re-auth** (interactive Chrome dance) → unblocks the other 15 engines.

**Not safe to rush before open:** changing live strategy *logic* for profitability. Those go through the
backtest-vs-live gate (Dimension 3) with your sign-off — not a pre-open hot-patch on real money.

> **Bottom line:** I can move infrastructure/observability/recording from ~C- to A this weekend.
> The system cannot reach a true **A+ (live, trading, recording, risk-managed)** until the two
> USER-gated credentials are restored. Give me those two and the rest is mechanical.
