# UTP Profitability Plan

> Produced 2026-07-11 from a full deep-dive of `ikigai-trade-os`, `ikigaitrade-engine`,
> and `ikigaios-jarvis-core` (axe-supervisor), plus the live Jarvis/VPS state and the
> Crown Macro Letter inbox. Phase 1 is implemented in the PR that carries this document.
>
> **2026-07-11 direction from Sir: Alpaca-first.** Agentic trading runs on Alpaca
> (AXE); once proven out, more capital moves from Schwab to Alpaca. Schwab is a
> funding source, not an execution priority (its connections have been unreliable);
> the IBKR engine phases below are kept for reference but are NOT the critical path.
> The proving ground is AXE's paper daemon → readiness grade → staged live-arm.
> AXE hot-path fixes shipped in `ikigaios-jarvis-core` PR #15.

## Executive summary

The platform has three trading stacks and none of them is currently positioned to compound an
edge — not because the strategies are bad, but because **the load-bearing wiring is broken or
unplugged in every stack**:

| Stack | What it is | Blocking problem |
|---|---|---|
| **Dashboard** (`ikigai-trade-os`) | Netlify AI-briefing + engine cockpit | Scheduled briefings fed `HTTP 403` strings instead of quotes (model fabricated numbers); two generators raced to overwrite each other at 11:00 UTC; news = 2 REST feeds, no newsletter, no web search |
| **IBKR engine** (`ikigaitrade-engine`, live acct U24381579) | E1 ORB / E2 45DTE / E3 0DTE + 14-agent AI layer | E1's scanner never marks anything tradeable (fires on an empty watchlist daily); **spread close is an unimplemented TODO** — the 2:55 PM E3 "auto-close" doesn't actually close spreads at IBKR; bracket exits go Inactive (known CRITICAL bug); learning loops (bandit, shadow book, sentiment) receive zero real signal |
| **AXE** (`ikigaios-jarvis-core`, Alpaca paper) | R&D brain: personas, 10-gate risk stack, quant lab | The paper daemon **bypasses the entire risk stack** it ships with; only 1 of 5 strategies actually fires (a daily SPY Donchian proxy); Kelly sizer and meta-label dataset built but unused |

**The profitability lever is not new strategies or more agents.** It is: (0) close the two
live-money safety holes, (1) make every AI input real — quotes, news, newsletter, web
search — *(done in this PR)*, (2) turn the already-built learning loops from zero-signal
simulations into real-P&L feedback loops, (3) let capital flow to what measurably wins,
through the promotion/readiness gates that already exist.

---

## System map (as found)

```
                        ┌────────────────────────────────────────────┐
                        │  ikigai-trade-os (Netlify)                 │
                        │  React SPA + 28 functions                  │
                        │  AI briefings via OpenRouter               │
                        │  news: Finnhub + MarketAux                 │
                        └───────┬───────────────────────┬────────────┘
                                │ /engines cockpit      │ save-accounts auth
                                ▼                       ▼
     ┌──────────────────────────────────────┐   trading.ikigaios.com
     │  UTP backend (/opt/utp, Hetzner)     │   = "UTP" FastAPI
     │  /api/engines /api/helios/status ... │   (code NOT in the 3 repos
     │  HELIOS = helios_etf_orb             │    studied — see Phase 0.4)
     └──────────────────────────────────────┘
     ┌──────────────────────────────────────┐  ┌───────────────────────────────┐
     │  ikigaitrade-engine (InterServer VPS,│  │  ikigaios-jarvis-core / AXE   │
     │  Windows, IB Gateway)                │  │  (Hetzner, Alpaca paper)      │
     │  E1 ORB · E2 45DTE · E3 0DTE         │  │  personas · 10-gate RiskGuard │
     │  14-agent debate · strategic_shield  │  │  quantlab · Kelly/CVaR sizing │
     │  paper DUQ170616 · live U24381579    │  │  readiness grade · promotion  │
     └──────────────────────────────────────┘  └───────────────────────────────┘
                 Jarvis/ATLAS (OpenClaw) queues "wave" commands to the VPSes
```

The dashboard's `/engines` page calls `/api/engines`, `/api/helios/status`,
`/api/kill-switch/*`, `/api/schwab/status`, `/api/scheduler/engine-jobs` — **none of which
exist in `ikigaitrade-engine`** (it serves `/api/engine1|2|3/*`, `/api/position/kill-switch`,
`/api/scheduler/jobs`, and has no HELIOS or Schwab). The UTP FastAPI at `trading.ikigaios.com`
is a fourth codebase not present in any studied repo.

---

## Phase priority under Alpaca-first

1. ~~Phase 0 (IBKR safety)~~ → **only if/while the IBKR engine keeps trading live**;
   if U24381579 automation is paused, these become do-before-reactivating items.
2. **Phase 1 (real AI inputs)** — ✅ shipped (this PR).
3. **Phase 3 (AXE)** — ✅ hot-path fixes shipped (`ikigaios-jarvis-core` PR #15:
   guarded broker + KillSwitchV2 on every submit, calibrated quarter-Kelly sizing,
   full sector-ETF watchlist, meta-label columns filled, tick ImportError fixed,
   systemd unit). Remaining: PEAD earnings/SUE feed, intraday-ORB bridge,
   backtests.jsonl for the readiness grade.
4. **Phase 4 (strategy/allocation)** — the proving loop: paper fills → attribution →
   readiness grade A/A+ × 14 days → staged live-arm on Alpaca → move capital.
5. Phase 2 (IBKR learning loops) — deferred with Phase 0.

## Phase 0 — Safety first (live-money holes; IBKR engine; ~1 day)

These precede everything **on the IBKR path**: an unprotected spread is the fastest
path to a large realized loss. Deferred while Alpaca is the focus — but mandatory
before the IBKR engine's next live entry.

1. **Implement spread close-at-market** — `engine/execution.py:2293` is `# TODO`. Today the
   2:55 PM CT E3 auto-close (`scheduler.py:1229`) and the dashboard CLOSE/ROLL path cancel the
   bracket and mark the position closed *locally* while the spread stays open at IBKR.
2. **Fix bracket exits going Inactive** — IBKR doesn't support OCA+BAG-combo+GTC
   (handoff 2026-04-02, BUG1). Exits must be re-placed as DAY orders re-armed each session, or
   monitored server-side.
3. **Finish the six P0 stability fixes** from the 2026-04-09 2FA-storm incident. Partially
   shipped: `connection.py:322` uses a *random* clientId 10–99 instead of the deterministic
   `(pid%30)+1` the incident review specified; watchdog cooldowns unverified.
4. **Persist the kill switch** — `/api/position/kill-switch` state is in-memory and silently
   resets on restart. Persist to SQLite and restore on boot.
5. **Locate/ingest the UTP backend repo** (`/opt/utp`, container `utp-app-1`) so HELIOS and the
   `/api/engines` registry get the same audit the other three repos got.
6. **Rotate leaked secrets** — dashboard password and restart token are committed in handoffs.

## Phase 1 — Real inputs for every AI decision ✅ SHIPPED IN THIS PR

| Fix | Why it matters |
|---|---|
| Scheduled briefings now use the multi-provider quote chain (Finnhub→TwelveData→Polygon→Yahoo) instead of Yahoo-direct | The cron path fed the model `"S&P 500: HTTP 403"`; it then fabricated numbers into "institutional" briefings |
| Removed the 11:00 UTC double-generation race | Two generators overwrote `briefings/latest` with different schemas every morning; double LLM spend |
| `_llm.mts` reports the model that actually served each request; misleading hardcoded "claude-haiku" labels removed | Every stored briefing claimed Claude while the deployment default is `deepseek/deepseek-chat` (`TRADEOS_LLM_MODEL` decides) |
| **Live web search** for AI generations: set `TRADEOS_WEB_SEARCH=true` (OpenRouter web plugin, ~$0.005/req) | "Faster search to Internet" — briefings/chat can ground on live headlines instead of stale training data |
| **Crown Macro Letter ingestion**: `POST /api/ingest-newsletter` + `GET /api/get-newsletter`, parser validated against real issues | Extracts thesis, catalysts, SPX gamma levels, trade setups (conviction/entry/stop/sizing), open/closed trades — and injects the fresh issue (≤14 days) into every scheduled briefing prompt |
| `/api/news?health=1` diagnostics | One-request answer to "are the news plugins live?": per-provider key status, item counts, newest-item age |
| `market-quote` + `sectors` moved to the multi-provider chain; sector "ytd" mislabel fixed (`dayChange`) | These endpoints were Yahoo-only → dead in production |
| `save-accounts` auth fails closed (503 when UTP unreachable) | Public write endpoint accepted any bearer whenever UTP was down |
| `.env.template` corrected | It documented the dead `ANTHROPIC_API_KEY` and omitted `OPENROUTER_API_KEY` — a fresh deploy following it had zero working AI |

**Env vars to set in Netlify to activate Phase 1:** `OPENROUTER_API_KEY` (required),
`TRADEOS_LLM_MODEL` (recommend `anthropic/claude-haiku-4.5`; `anthropic/claude-sonnet-4.6` for
flagship briefings), `TRADEOS_WEB_SEARCH=true`, `NEWSLETTER_INGEST_SECRET` (long random),
`FINNHUB_KEY`, `MARKETAUX_KEY`, and optionally `TWELVEDATA_KEY`/`POLYGON_KEY`.

**Newsletter delivery wiring (choose one):**
- *Zero-infra:* a scheduled Claude session/Jarvis job reads the Gmail label for
  `nicholas@newsletter.nicholascrown.com` daily at 05:30 CT and POSTs new issues to
  `/api/ingest-newsletter` (body: `{subject, receivedAt, text}`; header `x-ingest-secret`).
- *Standing infra:* Gmail filter → auto-forward → Cloudflare Email Worker or Mailgun inbound
  route → same POST. Add more sources (other newsletters, Discord alerts) with `source` set.

## Phase 2 — Make the learning loops real (IBKR engine; ~1 week)

Everything below is *already built* and starving on zero signal:

1. **E1 is dark.** `scanner.py` never sets `catalyst_type/score` → `tradeable` is always
   False → empty watchlist; and `scheduler.py:588` calls `run_scan(ib=...)` with a parameter
   that doesn't exist — a daily `TypeError` swallowed by `try/except`. Fix both; E1 starts
   seeing candidates again.
2. **Shadow book P&L is structurally $0.** `strategic_shield`: executor returns synthetic
   fills, no routine ever closes positions, snapshots mark at entry price, and the Critic
   derives P&L from a slippage field that is always 0 → the Thompson bandit receives a
   constant reward and cannot learn. Wire real entry/exit prices end-to-end.
3. **SentimentEngine has zero producers.** Feed it from the existing Finnhub pulls in
   `catalysts.py`/`gap_scanner.py` and the new newsletter pipeline (the Planner prompt already
   has slots for sentiment, calendar, and regime — all currently empty).
4. **Reconcile rule drift** so valid signals stop being rejected: E3 windows (dual CT windows
   in `engine3.py` vs "9:35–10:00 ET" in `validation.py` Rule 5), min-credit ($1.80 vs $2.00),
   E1 target (docstring 1–1.5R vs code 2.0R).
5. **E3 monitor gets positions** — `_job_e3_monitor_start` calls `check_positions()` on an
   always-empty list; the clock-time gamma stop can never fire.

## Phase 3 — Wire AXE's brain to its own hands (jarvis-core; ~1 week)

1. **Route daemon orders through the risk stack**: swap the bare `AlpacaPaperAdapter` for
   `GuardedBrokerAdapter` and call `RiskGuard.evaluate()` + `KillSwitchV2.check_order()` in
   `paper_runner._submit` — all 10 gates + VPIN + halt/HTB are built and tested, just not on
   the hot path.
2. **Turn the strategies on**: add the missing 7 sector ETFs so `taylor_sector_rotation` can
   fire; feed earnings dates + SUE so PEAD stops abstaining; bridge the daemon to the real
   intraday ORB engine (RVOL/VWAP/ATR gates) instead of the daily Donchian proxy.
3. **Size with the sizer**: replace fixed-$500 notional with `KellySizer` +
   `CalibrationTracker.shrink()` (quarter-Kelly on calibrated probabilities).
4. **Stop journaling nulls**: `regime_label`, `vix`, `sector_breadth` are computed each tick
   but written as null into the meta-label dataset — fill them, then train the meta-labeler.
5. **Populate `backtests.jsonl`** via the CPCV/deflated-Sharpe harness so the
   readiness grade can ever leave 0.0.

## Phase 4 — The better strategy (capital allocation layer)

With Phases 0–3 done, run this as the standing strategy:

1. **One newsletter-informed macro spine.** Crown Macro's weekly thesis + gamma levels +
   catalysts (now machine-readable) become the regime context every engine reads: e.g. this
   week's issue ⇒ range-bound semis, rotation to software/healthcare/financials, SPX 7,470
   gamma-flip as the risk line. The briefing already surfaces its setups with attribution.
2. **Every trade journaled with regime + sentiment + newsletter-alignment features** (the
   meta-label dataset), so the system learns *when* each engine's edge is on.
3. **Promotion by evidence, not vibes**: strategies live in paper → shadow → live, promoted
   only on the existing gates (20+ closed trades, positive expectancy net of costs, paper
   Sharpe ≥ 0.5× backtest, 14 consecutive A/A+ readiness days) and auto-retired on the CUSUM
   decay alarm. Capital allocation shifts toward winners via the engine-allocation logic
   already in `self_evolving.py`.
4. **Autonomy stays laddered** (observe → suggest → act → auto per engine, as the UTP cockpit
   already models), gated on the documented trade-count/win-rate/Sharpe thresholds.
5. **Weekly cadence**: Sunday — ingest the week's Crown Macro issue, run the week-ahead
   briefing against it; daily 05:30 CT — newsletter poll + premarket health checks; Friday —
   EOD reflection + readiness scorecard to Telegram; monthly — promotion/retirement review.

## Phase 5 — Verification & ops cadence

- `/api/news?health=1` in the morning health check; alert if newest item > 6h old.
- Netlify: confirm exactly one briefing per slot after this PR (no more double-generation).
- IBKR: after Phase 0, a paper-account drill that *proves* a spread actually closes at IBKR
  (positions flat at broker, not just locally) before the next live E3 entry.
- Jarvis wave commands (each ≤6 min, atomic, per existing queue discipline) are the natural
  vehicle for the VPS-side fixes; queue them Sir-approved as WAVE-B: B1 spread-close, B2
  bracket-exit rework, B3 scanner signature+catalyst fix, B4 kill-switch persistence, B5
  clientId determinism, B6 AXE GuardedBroker wiring, B7 AXE watchlist/strategy activation,
  B8 verification gate + Telegram scorecard.

## What "profitable" realistically requires

No fix on this list manufactures edge; they make it possible to *find and compound* one. The
honest sequence the codebase itself encodes: real fills → real P&L → real learning →
evidence-gated promotion → capital concentrates on what wins. The academic bases (E1 ORB
Sharpe 2.81 pre-10:30; E2-style 45DTE spreads 75–80% win rate; 0DTE day-of-week effects) are
only priors until the paper track record confirms them net of costs. Expect weeks of clean
paper data before the readiness gates should let anything new touch account U24381579 — that
is the system working, not a delay.
