# Trading System Rubric Scorecard

> 2026-07-11. Grades the bots, agents, and strategies across all three stacks against a
> 10-category rubric anchored to (a) the platform's own graders — the AXE
> `paper_readiness_grade` (A+ ≥ 0.85 composite; live-arm requires A/A+ for 14 straight
> days) and the 18-category engineering rubric in `docs/GRADING.md` — and (b) external
> best practice: walk-forward validation as the standard for strategy robustness
> ([Build Alpha](https://www.buildalpha.com/robustness-testing-guide/),
> [MQL5](https://www.mql5.com/en/blogs/post/772184)), the Deflated Sharpe Ratio for
> multiple-testing bias ([TradingWyckoff](https://tradingwyckoff.com/en/algorithmic-trading/algorithmic-trading-metrics/)),
> overfitting red flags ([LuxAlgo](https://www.luxalgo.com/blog/what-is-overfitting-in-trading-strategies/)),
> and evidence-ledger + calibration (Brier/ECE) discipline for LLM trading agents
> ([Wisdom Chain](https://insights.wisdomchain.com/agentic-trading-evidence-ledger/),
> [TradeTrap](https://arxiv.org/pdf/2512.02261)).
>
> **Overall: C at session start → B after today's fixes.** The remaining distance to
> A/A+ is deliberately not codeable — it is earned paper performance flowing through
> gates that now actually compute. Run `axe grade show` for the live number.

## Scorecard

| # | Category | Was | Now | What changed today | What A+ requires |
|---|----------|-----|-----|--------------------|------------------|
| 1 | **Strategy validation** (backtest → walk-forward → deflated Sharpe) | F | C‑ | Backtest/walk-forward writers existed but nothing ran them → `nightly_baselines.sh` + `axe-baselines.timer` populate `backtests.jsonl` + `walk_forward.jsonl` nightly | 180d baselines per strategy, overfitting score < 0.15, paper Sharpe ≥ 0.5× backtest for 30d |
| 2 | **Live signal generation** | F | C+ | Daemon traded ONE signal (daily SPY Donchian); every tick also died on ImportError from a clean checkout. Fixed tick; sector rotation live (11 SPDRs) | PEAD earnings/SUE feed wired; daemon bridged to the real intraday ORB engine (RVOL/VWAP/ATR); ≥3 strategies producing ≥5 fills/30d each |
| 3 | **Risk enforcement on the hot path** | D | A‑ | 10-gate RiskGuard + KillSwitchV2 now run on every daemon submit (were fully bypassed); realized P&L feeds the daily-loss cap | VPIN + halt/HTB gates instantiated in the factory (classes exist, not wired); one clean month with zero gate bypasses in the audit log |
| 4 | **Execution & exits** | F | B‑ | No exit path existed at all (Alpaca orders carry no stop leg — positions could literally never close). Exit engine: 1% stop / 2R target, market closes, restart-safe journal | Resting-limit fill reconciliation; slippage tracking vs. the 5 bps model; time-based exits per strategy |
| 5 | **P&L truth & attribution** | F | B‑ | Realized round trips now journaled with `pnl_usd`; readiness grader counts round trips, not pnl-less entry legs | 30 days of unbroken closed-trade history reconciling with Alpaca statements; EOD attribution anomalies at zero |
| 6 | **Learning loops** | C‑ | C+ | Meta-label dataset's regime/VIX/breadth columns now record real values (were hardcoded nulls) | Train the meta-labeler on ≥100 journaled signals; reflection lessons demonstrably changing entry filters |
| 7 | **News & context ingestion** | D | B | Crown Macro Letter pipeline (parsed thesis/levels/setups → briefings), OpenRouter live web search, news health endpoint; AXE journals pre-open sentiment | Sentiment upgraded from keyword-regex to model-scored; newsletter setups tracked against outcomes |
| 8 | **AI agent quality & calibration** | B | B | Already strong: Brier/ECE calibration tracker, shrink-before-Kelly, debate diversity, cost ceilings — and sizing now actually uses it (quarter-Kelly replaced fixed $500) | Calibration tracker accumulating ≥100 scored predictions per agent; per-agent Brier < 0.20 (the platform's own promotion bar) |
| 9 | **Ops reliability** | C‑ | B+ | Paper daemon got a systemd unit (was hand-launched) with restart-storm caps; baselines timer; tick loop can no longer be killed by a dead optional feed | Hetzner RAM pressure resolved (was 305 MiB free, load 8.5); deadman alerts on daemon + baseline timers verified firing |
| 10 | **Governance & promotion gates** | B‑ | A‑ | The A+..F readiness gate now *computes* (three of five criteria were structurally 0.0 forever); 14-day A-streak rule enforced in code | Nothing — this category just needs the data to flow. First `eligible_for_live=true` event fires a P2 alert |

**Composite: C → B.** Weakest links now are #1/#2 (validation baselines + more live
signals), which tonight's timer and the two named follow-ups address.

## Why A+ cannot be granted today — and exactly how it arrives

The platform's own gate is the honest one: `paper_readiness_grade` composite ≥ 0.85
with **14 consecutive days at A or better**, per strategy. Before today, that grade
could never leave the floor: no exits → no realized P&L → win-rate/Sharpe/rank pinned
at 0; no scheduled baselines → alignment/overfitting pinned at 0. That is a C system
by construction — *"if all your backtest metrics are excellent, you probably have
overfitting; with fewer than 100 trades, metrics are not statistically significant"*
([LuxAlgo](https://www.luxalgo.com/blog/what-is-overfitting-in-trading-strategies/)).

The path, day by day:
1. **Tonight**: `axe-baselines.timer` writes the first backtest + walk-forward rows;
   `axe grade run` records the first honest composite (expect C/D — criteria now
   measure instead of defaulting).
2. **Days 1–10**: daemon accumulates round trips (needs ≥5 closed trades/30d per
   strategy before win-rate even counts). Watch `axe grade show` trend.
3. **Days 10–30**: paper Sharpe vs. backtest alignment becomes meaningful; strategies
   that can't hold ≥0.5× backtest Sharpe hard-fail — that's the deflated-expectations
   discipline working, not a bug.
4. **A/A+ × 14 days** → `eligible_for_live=true` fires the ready-for-live alert →
   staged live-arm on Alpaca (`AXE_LIVE_TRADING_ACK` + passphrase) → move capital
   from Schwab.

## Standing verification cadence

- **Nightly**: `axe-baselines.timer` (23:30 UTC) → baselines + `axe grade run`.
- **Daily**: `axe grade show` — the rubric score, live.
- **On every fill**: audit rows carry sizing reasons, gate decisions, round-trip P&L.
- **Weekly**: EOD attribution anomaly count should be zero; decay t-stat > −1.5.
