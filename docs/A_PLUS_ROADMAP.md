# UTP Trading System — Remediation Roadmap to A+

> Companion to `TRADING_SYSTEM_SCORECARD.md` (current grade: **D+**).
> Goal: a sequenced, research-grounded plan that moves each dimension to **A**, with
> explicit **acceptance criteria** and **owner**. Generated 2026-06-22.
> Live status as of writing: **Helios is LIVE** on real account `…dd04` (order-gate
> verified PASS); recording chain still broken; 15 Schwab engines blocked on re-auth.

---

## Guiding principle (why A+ is sequenced, not one-shot)

A trading system can't be *declared* A+ — it has to *earn* it by trading live, recording
faithfully, and surviving failures without silent gaps. A 2025 Stanford study found **58% of
retail algo strategies collapse within 3 months of going live**, driven by backtest overfitting
and the execution gap ([turbinefi](https://www.turbinefi.com/blog/why-backtests-lie-prediction-market-overfitting-2026)).
So the roadmap front-loads **safety, recording, and observability** (so we can *see* the truth),
then **validation** (so we trust the edge), then **profitability**.

---

## Phase 0 — Safety net (do FIRST, deployable tonight, market closed)

| Step | Acceptance criteria | Owner |
|------|--------------------|-------|
| Persist live config to `.env` so a rebuild can't silently revert (✅ done in cutover) | `ALPACA_PAPER=false` survives `--force-recreate`; verified live | ✅ me |
| Move live keys to dedicated `APCA_LIVE_*` vars, restore paper key (cmd 266, queued) | Startup shows no false "no live keys" warning; paper key intact | me |
| **Rotate the chat-exposed key pair** | Old key revoked in Alpaca; fresh pair in **Vault**, injected at boot (not `.env`) | **USER + me** |
| Config-drift alarm | A change in `ALPACA_PAPER` or key-presence between restarts → `critical` → Telegram | me |

---

## Phase 1 — Recording chain (BLOCKS trust; before tomorrow's open)

Current: `public.strategy_events` empty; `order_submitted/filled/fill` = 0 fleet-wide for 10 days;
11 positions reconcile as `broker_only`. **Live fills could execute and never be recorded.**
Best practice: confirm fills, detect partial fills, handle rejections with retry, and **log every
order event with an idempotency key** so a replayed message can't double-book a trade.

| Step | Acceptance criteria | Owner |
|------|--------------------|-------|
| Diagnose the break (cmd 267, running) | Exact `file:line` where order/fill emit + `strategy_events` insert fail to fire | me |
| Restore `strategy_events` writer + `order_submitted/order_filled` emission | A test order produces rows in `public.trades` **and** `public.strategy_events` + JSONL | me |
| Idempotency keys on every order/fill | Replaying the same broker event inserts **0** duplicate rows (`dedupe_key` enforced) | me |
| Nightly broker↔ledger reconciliation + alert | `broker_only`/`ledger_only` mismatch → `critical` → Telegram; target `mismatch=0` | me |

---

## Phase 2 — Observability & self-healing (prevents recurrence)

The failure that started this — token expiry + silent paper-revert + dark engine — produced **no
page**. The fix is "failure-as-default" monitoring: a heartbeat that's *always expected to fire*,
so its absence is the alarm ([oneuptime](https://oneuptime.com/blog/post/2026-02-06-heartbeat-dead-man-switch-opentelemetry-pipeline/view),
[Prometheus Watchdog pattern](https://github.com/prometheus/alertmanager/issues/1542)).

| Step | Acceptance criteria | Owner |
|------|--------------------|-------|
| Deep broker/token **validity** check (not just reachability) → `critical` → Telegram | Expired/expiring token pages Telegram ≥48h out | me |
| "Engine went dark" dead-man | No trades/events in N hrs during market → page | me |
| Escalating Schwab re-auth ladder | Day-5 warn → Day-6 `critical` → emergency repeat until fresh token | me |
| Docker `healthcheck` on app container + autoheal cosmetic fix | Hung/degraded app (not just crashed) auto-restarts; `utp-autoheal-1` healthy | me |

---

## Phase 3 — Portfolio & risk management

Best practice for many strategies: sit each engine under a **portfolio overlay** — size by
**fractional Kelly** (½–¼ Kelly cuts volatility far more than it cuts growth —
[MacLean/Thorp/Ziemba](https://blog.quantinsti.com/risk-constrained-kelly-criterion/)), **volatility-target**
the book, and **cap gross/net leverage** (e.g. ≤2.0) so exposure can't run away.

| Step | Acceptance criteria | Owner |
|------|--------------------|-------|
| Adopt the orphan positions into the ledger | `broker_only=0`; every open position has a ledger record | me + **USER** review |
| Portfolio-level gross/net + per-name exposure caps | Orders that breach caps are blocked pre-trade | me |
| Vol-target + fractional-Kelly sizing layer | Position sizes scale inversely with realized vol; leverage ≤ cap | me |
| Daily drawdown monitor → auto-deleverage / kill-switch | Breach of daily/peak DD limit auto-flattens or pages | me |

---

## Phase 4 — Backtest-vs-live validation (earns the "profitable" grade)

You can't call a strategy profitable off a backtest. Discount the backtested Sharpe by the number
of trials (**Deflated Sharpe Ratio**), validate with **Combinatorial Purged CV** (lower Probability
of Backtest Overfitting than plain walk-forward), hold out **20–30% untouched** test data, and model
slippage/commissions/latency ([pickmytrade](https://blog.pickmytrade.trade/trading-strategy-validation-backtest-overfitting/),
[ScienceDirect on CPCV](https://www.sciencedirect.com/science/article/abs/pii/S0950705124011110),
[López de Prado, arXiv:1408.1159](https://arxiv.org/pdf/1408.1159)).

| Step | Acceptance criteria | Owner |
|------|--------------------|-------|
| Per-engine backtest-vs-live tracking report | Daily: expected vs realized Sharpe/win-rate/slippage; alert on drift | me |
| Promotion gate observe→suggest→act | Engine promotes only if live DSR > threshold over min sample | me + **USER** sign-off |
| Schwab re-auth → unblock the other 15 engines | `/api/schwab/status connected:true`; engines transacting | **USER** (OAuth) |

---

## What "A+" actually requires (honest definition)

| Dimension | A+ looks like |
|-----------|---------------|
| Execution & Recording | Every live order → recorded in `trades`+`strategy_events`, idempotent, `mismatch=0` nightly |
| Broker Readiness | Both brokers connected; keys in Vault; token auto-paged before expiry |
| Backtest-vs-Live | Live DSR within tolerance of backtest; CPCV-validated; promotion gated |
| Portfolio & Risk | Vol-targeted, leverage-capped, DD-monitored, zero orphan positions |
| Observability | Heartbeat dead-man + deep checks; **no silent failure possible** |
| Dashboard | LIVE/PAPER + freshness + orphan widget; builds green (✅ Netlify) |
| Governance | Config-drift alarmed; idempotency live; two-man live gate intact |

**Reality check:** Phases 0–2 I can land in days. A *true* A+ on Dimensions 3–4 requires the system
to **run live and clean for a validation window** plus **your Schwab re-auth** — it's earned over
sessions, not flipped on. I'll drive every code/infra item; the two hard dependencies on you are
**Schwab OAuth** and **key rotation into Vault**.

---

## Sources
- [Why backtests lie / Stanford 58% stat — Turbine](https://www.turbinefi.com/blog/why-backtests-lie-prediction-market-overfitting-2026)
- [Backtest overfitting validation — PickMyTrade](https://blog.pickmytrade.trade/trading-strategy-validation-backtest-overfitting/)
- [CPCV vs walk-forward (PBO/DSR) — ScienceDirect](https://www.sciencedirect.com/science/article/abs/pii/S0950705124011110)
- [Optimal trading rules / DSR — López de Prado (arXiv:1408.1159)](https://arxiv.org/pdf/1408.1159)
- [Heartbeat & dead-man's switch — OneUptime](https://oneuptime.com/blog/post/2026-02-06-heartbeat-dead-man-switch-opentelemetry-pipeline/view)
- [Dead-man switch / Watchdog pattern — Prometheus Alertmanager](https://github.com/prometheus/alertmanager/issues/1542)
- [Risk-constrained / fractional Kelly — QuantInsti](https://blog.quantinsti.com/risk-constrained-kelly-criterion/)
