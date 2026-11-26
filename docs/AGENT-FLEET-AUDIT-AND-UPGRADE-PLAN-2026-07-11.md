# Agent Fleet Audit & Second-Brain Upgrade Plan

_Date: 2026-07-11. Scope: the full ikigaiOS agent estate — Jarvis (Hostinger), ATLAS (Hetzner), Vision (desktop), Axe, Dollar Bill, Pepper Potts, and the memory/learning substrate in `O2leGit/ikigaios-jarvis-core`. Method: full code audit of jarvis-core @ `6ca5425` (main), live Jarvis MCP queue status, cross-checked against the system's own July 4-5 audits, plus fresh July 2026 external research._

---

## TL;DR

Your agents are **well-designed but partially asleep**. The architecture (authority gates, trust ladder, trifecta invariant, eval-outside-the-loop) is genuinely strong — your own July 5 red-team called several pieces "frontier-grade." But as of today:

1. **The command queue is stalled.** 3 commands are sitting `pending` with **zero worker executions since July 4** (7 days). Neither the VPS auto-poller nor the desktop poller is claiming work. Until this is fixed, nothing else can be fixed *by the system itself*.
2. **The daily memory pipeline went quiet again.** Last real daily memory file: `memory/2026-07-04.md`. The "memory deadman" promised in Wave A2 either isn't firing or isn't deployed.
3. **Recursive learning is only ~40% closed.** Two loops genuinely close (trading EOD lessons → next-day prompts; voice facts/Hindsight → voice pre-roll). The rest — RUBIX self-improvement, wiki consolidation, skill promotion — is dormant, gated off, or writes to places nothing reads.
4. **You still can't hand your agents information.** There is no path for you to give Jarvis a document, note, or file and have it become retrievable memory. This is the single biggest gap between what you have and a "second brain."
5. **The July 5 truth-fixes are real** — I verified them in HEAD (memory burn-bug guard, authenticated read plane, urgency sort, token split). Good. But the enforcement spine (NEVER_AUTO_SEND as code, GUARDRAILS.md, brief staleness contract, feedback taps) is still unbuilt, which blocks Wave 2 (drafting) safely going live.

The recommended path (detail in §7): **revive the heartbeat → make silence loud → open the input door → unify memory → then earn autonomy.** Most of this maps onto plans your system already wrote for itself; the plans are good — they stopped being executed on July 5.

---

## 1. What's live right now (verified today)

| Signal | State | Evidence |
|---|---|---|
| Jarvis MCP queue (`jarvis-main`) | **STALLED** — 3 pending, 0 running, 0 calls/24h | Live `fetch_status` 2026-07-11 |
| Last worker execution | 2026-07-04 12:49 UTC (WAVE-A8 scorecard) | Execution log id 317 |
| Daily memory files | Last: `memory/2026-07-04.md`; only weekly `dr-verify` stamps since (Jul 6) | repo `memory/` |
| Wave 1 brief (email+calendar → Telegram) | Deployed LIVE 2026-07-04/05 per roadmap change-log; current delivery unverified from here | `docs/roadmaps/PERSONAL-AI-OS-ROADMAP.md` change log |
| Learn loop (episode consolidation) | Flipped ON + quality-passed 2026-07-05 (36 → 353 real facts); no evidence of runs since | roadmap change log 2026-07-05 |
| Weekly self-audit script | **Still not in git** — `infra/vps-scripts/` has no `weekly-self-audit.sh`; the script the red-team caught saying "ALL SYSTEMS NOMINAL" over failures remains host-only | verified in HEAD |
| Branch sprawl | 11 remote branches; `wave1-speed` (trading work), `landing-uncommitted-20260704` (stranded-work rescue), `vision-master-v3`, `sprint-4-voice` unmerged | `git ls-remote` |

**The pattern:** every outage above is the same disease your own audit named — *silent-green failure*. The queue died and nothing alerted. The memory files stopped and nothing alerted. This is why observability fixes must come before capability adds.

### July 5 fixes — verified real in today's HEAD

| Fix | Status in `main` @ 6ca5425 |
|---|---|
| Consolidation burn bug (episodes marked "learned" on LLM failure) | ✅ Guarded — `consolidate.py:574-579` only stamps on parse success |
| Unauthenticated dispatcher read plane (anyone could dump email/memory via `{"agent":"jarvis"}`) | ✅ 33 `checkAdminGate`/`checkScopedGate` references; scoped ingest token split from admin token |
| Inverted urgency sort (normal outranked high in needs-you) | ✅ `URGENCY_RANK` map at `email-triage.ts:234,369` |
| Non-constant-time token compare | ✅ `timingSafeEqual` at `server.ts:417-424` |

### Still absent from code (promised, not landed)

- `NEVER_AUTO_SEND` — **zero** source references (docs-only). Blocks Wave 2 drafts.
- `GUARDRAILS.md` — does not exist. Blocks any self-improvement loop.
- Brief staleness contract — `brief_compose.py` has no STALE/error rendering; a dead feed still renders as a quiet inbox / free day.
- Brief feedback loop — no thumbs/correction capture anywhere.
- B1 frozen 30-question memory probe baseline — `evals/digital_twin/recall_v1.jsonl` exists as a harness input, but the frozen-baseline discipline (agent may never edit; gate promotions on it) isn't wired.
- HARD BOUNDARY clause in `IDENTITY.md` — grep comes back empty.

---

## 2. The fleet, as it actually stands

| Agent | Role | Host | Brain | Two-way channel | Live? |
|---|---|---|---|---|---|
| **Jarvis** | Sir's daily proxy: briefs, approvals, Telegram face | Hostinger (Hermes v0.9) | qwen3-30b-a3b primary, gpt-oss-120b fallback, frontier via OpenRouter for hard reasoning | Telegram @JarvisO2lebot | ✅ (brief live; queue workers down) |
| **ATLAS** | Production execution + authority gate + dispatcher (~50 endpoints) | Hetzner (OpenClaw) | xRouter UCB1 bandit over model/transport pairs | Dispatcher API; Discord mirrors | ✅ |
| **Vision** | Desktop R&D lead; skills, screenpipe digests, sandbox | Desktop WSL (Hermes v0.13) | Sonnet 4.6 via OpenRouter + local Ollama | CLI only (no HTTP gateway) | ⚠️ partial, see §4 |
| **Axe** | Trading R&D (paper) | Desktop, under Vision | own Hermes profile | Discord mirror | ✅ (EOD reflection loop runs) |
| **Dollar Bill** | Production trading | Hetzner under ATLAS | per-strategy sub-agents | — | ❌ staged/greenfield |
| **Pepper Potts** | BizDev: prospecting, outreach *drafts* | cross-env | drafts-only profile, gmail read+draft, send forbidden | — | ❌ staged |
| COO / Q / Sentinel / Horizon / Fiscal / Covenant / Nexus / Custodian / Treasury | governance personas | Hetzner | — | — | docs + partial timers (Sentinel watchdogs real; Horizon scans "implementation deferred") |

**Command flow:** You → Jarvis MCP (`jarvis.cotoole.com/mcp`, OAuth for Claude iOS/web) → control-plane FastAPI → Postgres `jarvis.command_queue` → auto-poller (VPS, every 1 min) or desktop poller (30s) → `claude -p` worker → result + Telegram. This is a solid spine — **and it's the thing currently down.**

**Tool reach today (all read-only by design):** Gmail (1 of 3 accounts, metadata-only), Calendar (read), Telegram (read + send-to-Sir), Brave search, IBKR positions/balance (read), filesystem (read), memory facts/episodes (read/write), trade proposals (approval-gated). **No send verbs anywhere** — correct per your guardrails, but note there's also *no draft surface yet* (Wave 2 unbuilt).

---

## 3. Memory: what's actually wired

Four physically separate stores, partially connected:

```
you (voice) ──corrections──▶ jarvis.facts (PG, bitemporal) ──┐
you (voice) ──episodes────▶ Hindsight bank chris-personal-twin│──▶ voice pre-roll ✅ CLOSED
                                   │ nightly (spend-gated ⚠️)  │
                                   ▼                           │
                            jarvis-wiki (3+ divergent roots ⚠️)◀─ voice wiki_query (substring search only)
trading (Axe) ──reflections──▶ ~/.axe/journal.jsonl ──EOD──▶ docs/lessons/*.md ──▶ next-day agent prompts ✅ CLOSED
telegram/email/episodes ──monthly──▶ jarvis.memory_facts (PG) ── consumed by: voice pre-roll? NO. brief? NO. dispatcher? partially
```

**What works (keep, don't touch):**
- Voice pre-roll injection: parallel Hindsight recall + active-facts injection as ground truth (`agent_worker.py:2029-2114`). Genuinely closed.
- Voice corrections → bitemporal tombstone+insert (`facts_client.py:260-329`). Real knowledge-update handling.
- Trading Reflexion → EOD lessons → injected into every trading agent's next-day prompt (`eod_reflection.py:480-502`, `agents/base.py:71-77`). Your most-closed recursive loop.
- Hindsight itself: your own bench had it at 91.4% LongMemEval — near-frontier. The July 1 plan's "EXTEND, don't replace" call was right.

**What's broken or open:**
1. **Nightly consolidator spend gate.** `consolidate_hindsight_to_wiki.py:309-314` no-ops unless `ANTHROPIC_API_ALLOWED=true`, and the deployed systemd unit doesn't set it. The burn bug is fixed in code, but the loop may still be producing zero facts nightly — and the SLA check (`verify_consolidation_sla.py:63-92`) is mtime-based, so it stays green either way.
2. **Wiki split-brain.** Consolidation writes `C:/Users/Chris/jarvis-wiki`; the repo has its own `jarvis-wiki/`; the Drive sweep writes `/var/lib/hermes/jarvis-wiki`; screenpipe writes `agentic-company-wiki/vision/observations`. No surface sees the whole brain.
3. **No semantic retrieval anywhere.** Wiki search is substring counting (`agent_worker.py:1223-1260`); facts pre-roll is recency-ordered; the pgvector migration is a TODO that never landed; FTS indexes a permanently-NULL column.
4. **Two unreconciled fact stores.** `jarvis.facts` (voice) and `jarvis.memory_facts` (consolidator) have different tombstone/TTL semantics and no bridge; expired facts are still returned (no `expires_at > NOW()` filter, no sweeper).
5. **No cross-agent memory.** Trading lessons never reach Jarvis; personal facts never reach the trading desk; the brief reads none of it.
6. **No ingestion path for you.** Drive sweep stores metadata stubs (bodies "Not yet ingested"); Gmail ingest is metadata-only; `/wiki-ingest` is manual; there is no "here, remember this" surface. **This is the gap that most limits "I can give them information."**

---

## 4. Vision: three agents wearing one name

The deep-dive found "Vision" is **three different identities sharing one Hermes profile dir**:

1. **VISION the R&D lead** (`agents/VISION.md`) — charter explicitly forbids making trades.
2. **Vision the desktop trading twin** (`infra/jarvis/vision-skills/vision-identity/SKILL.md:40-47`) — emits `buy`/`sell`/`flatten`/`kill` action payloads, symlinked into *the same profile* the R&D charter governs.
3. **Vision the retired voice daemon** (`infra/jarvis/vision-agent/`, RETIRED 2026-05-17).

That's a live charter contradiction, and your own red-team flagged the trading-twin channel as "one wired field from live." Additional findings:

- The governance layer (cost caps, audit hook, kill switch, skill packager, promotion poller) is **real and good** — but the final hop, the Jarvis-side `skill-puller`, is **dormant past its own 2026-06-09 cutover date**. Promotion pipeline proven end-to-end only by the `hello-world` no-op.
- Vision's actual R&D skills (`vision-frontier-weekly` etc.) live only on the desktop, not in git — unverifiable, unrecoverable if the desktop dies. (Wave E "Vision resurrection" is still pending — command 316 was queued for discovery and presumably sits in the stalled queue.)
- The "Vision-owned" second-brain consolidation actually runs as *Jarvis* nightly and is spend-gated off (§3.1).
- `xrouter_feedback.py` hardcodes `surface_id: "vision"` for all consolidation feedback regardless of true surface — polluting the router's learning signal.

---

## 5. Recursive learning: scorecard

| Loop | Trigger | Lands where | Feeds back into behavior? |
|---|---|---|---|
| Trading per-trade Reflexion | trade close | `~/.axe/journal.jsonl` | ⚠️ journal is write-mostly (dashboard reads it; prompts don't) |
| Trading EOD reflection | 21:05 UTC weekdays | `docs/lessons/*.md` | ✅ **YES** — injected into next-day prompts |
| Voice corrections | per utterance | `jarvis.facts` | ✅ **YES** — pre-roll ground truth |
| Nightly Hindsight → wiki | 03:30 UTC | jarvis-wiki (desktop root) | ⚠️ only voice `wiki_query` reads it; spend gate likely closed |
| Monthly episodes → facts | 1st of month | `jarvis.memory_facts` | ⚠️ flipped on Jul 5; next run Aug 1; facts not yet consumed by brief/dispatcher prompts |
| RUBIX self-improvement arena | none (dormant) | — | ❌ migrations unapplied, no timer, critiques never reach the generator |
| Skill promotion (Vision → Jarvis) | packager + poller | wiki `approved-skills/` | ❌ final ingest dormant |
| Weekly self-audit | Sun 14:00 UTC | Telegram | ❌ worse than nothing until verdict logic is fixed (reported NOMINAL over failures) |
| Brief feedback | — | — | ❌ doesn't exist |

**Honest answer to "are my agents actually recursive in learning?": partially.** The trading desk is. The voice twin is. Everything else is either dormant, gated off, or missing the read-back half of the loop.

---

## 6. What the frontier looks like right now (July 2026)

_(Fresh research sweep, primary sources in §9. Your own July 5 appendix was already current on the vendor bar — Pulse/Gemini/Copilot daily briefs, memory-with-citations, lethal trifecta. What follows is what's new or directly actionable for your stack.)_

**Your architecture is validated by convergent evolution — three independent stacks landed on your shape:**
- **Plain files beat databases as the primary memory substrate.** Anthropic (memory tool, now GA: `memory_20250818` — agent-curated file store), OpenClaw (`MEMORY.md` + `memory/YYYY-MM-DD.md` daily notes), and Claude Code all converged on Markdown files with a short always-loaded index (~200-line cap) and just-in-time retrieval of the rest. Vector/graph stores are best as a *search index over* the files, not the source of truth. Your MEMORY.md + daily notes + wiki design is the right shape — it's the ops, not the design, that's failing.
- **Sleep-time consolidation is now productized on three stacks**: Anthropic "Dreams" (async job over session transcripts → a *new reviewable output store*, never in-place edits), Letta sleep-time agents, and OpenClaw's `dreaming` pass (disabled by default; scores short-term recall signals, promotes qualified candidates into MEMORY.md, logs to DREAMS.md for human review). Your nightly consolidator is exactly this pattern — with the gate closed.
- **Non-destructive, eval-gated promotion is the consensus for self-improvement.** ICLR 2026 RSI workshop + multiple skill-learning benches: curated skills help, *unreviewed self-generated skills measurably degrade agents*. Every serious system stages candidates → eval/human review → promote. RUBIX's evaluator-outside-the-loop design is exactly this — dormant, but ahead of most of the field on paper.

**Directly actionable for you:**
- **OpenClaw-side (ATLAS)**: memory flush before compaction is on by default; **dreaming is a config flip away** and mirrors your Wave B consolidation goals natively. The `memory-lancedb` official plugin (or `memory-lancedb-pro`: vector + BM25 → RRF fusion → rerank → recency boost → time decay → MMR de-dup) is a drop-in hybrid-retrieval upgrade over `memory-core`'s store. OpenClaw 2026.3+ also unified subagents/cron/background tasks onto one SQLite ledger ("Task Brain") — relevant when you next upgrade (you're on 2026.6.6).
- **Ingestion is now solved plumbing**: Google-managed Workspace MCP servers (Gmail/Drive/Calendar/People) went GA at Cloud Next '26 — a maintained alternative to hand-rolled OAuth pullers, and the cheapest way to cover your two unminted gmail.com accounts. Voice notes → Whisper transcription → agent files it into memory is the dominant personal capture pattern and is native in OpenClaw's Telegram path.
- **Memory is an attack surface** (their docs say it plainly now): read-write memory + untrusted input = persistent prompt injection. Ingestion-facing agents write to *staging only*; shared/reference stores read-only; versioned writes for rollback. This is your Wave B4 provenance/quarantine design — the field caught up to your plan; now the plan needs code.
- **Ignore memory-vendor benchmark wars.** LoCoMo/LongMemEval vendor numbers are unreproducible (Zep 84% → re-run 58% → rebuttal 75%; third-party reproductions miss claims by 30-50 points). Your Wave B2 instinct — "MemPalace promoted ONLY if it beats the frozen B1 baseline on *your* data" — is precisely the right discipline. Keep it.
- **Hybrid retrieval (vector + BM25 + recency fusion) is the consensus floor.** Substring counting is below the floor.

---

## 7. Recommended upgrades — priority order

The sequencing rule from your own audit stands: **truth → spine → capability → autonomy**. Everything below is extend-not-replace.

### P0 — Revive the heartbeat (this weekend, ~hours)

The system can't heal itself while the queue is dead.

1. **Restart the workers.** On the VPS: check `auto-poller` service/cron (`journalctl`, `systemctl status`, or the cron wrapper log); on the desktop: the poller daemon. Find *why* they stopped July 4 (the Wave A4 timeout change touched `auto-poller.env` — prime suspect if a restart never happened or an env var is malformed).
2. **Triage the 3 pending commands** before workers wake up — they're 7 days stale; cancel anything now-wrong rather than letting a worker blindly execute it.
3. **Queue-liveness deadman.** Add a check (cron on either host): `oldest pending command age > 30 min → Telegram alert`. The queue must never silently die again. Same pattern as your healthlog deadman.
4. **Memory-pipeline deadman, for real this time.** Wave A2 claimed one; the evidence (no daily files since Jul 4) says it isn't firing. Assert on *content* (a dated memory file OR a Hindsight episode count increase in 24h), not mtime.

### P1 — Finish "Restore Truth" (week 1)

Complete the remaining items from your July 5 plan's Wave 1 — they're small and specced:

5. **Verify the nightly consolidator actually runs**: on-host, confirm `ANTHROPIC_API_ALLOWED=true` + key in the service env; then check `jarvis.memory_facts` count is growing. (The code guard is in; the env may still be closed.)
6. **Staleness contract in the brief**: dead email feed renders `Email: STALE (Xh)`, calendar error renders as an error line, footer states scope ("covers chris@cotoole.com only, last ingest HH:MM"). Never a confident lie.
7. **Self-audit script into git + honest verdict**: any non-PASS line ⇒ non-NOMINAL + nonzero exit. Promotions stop riding on a lying signal.
8. **Merge or close the stranded branches** (`landing-uncommitted-20260704`, `wave1-speed`, `wave1-truthfix-20260705`, `vision-master-v3`) — the multi-clone drift that forced 13 hand-resolved conflicts is a corruption vector for your source of truth.

### P2 — Open the input door (weeks 1-2) ← your explicit ask

This is "I can give them information," and it's mostly Wave C of your own roadmap, pulled forward because it's the highest-leverage assistant feature you're missing:

9. **Telegram capture-to-memory.** Any message you send Jarvis prefixed `remember:` (or forwarded from anywhere) → Hindsight episode + a dated capture file in the wiki `_inbox/`, provenance-tagged `source=sir/telegram`. One evening of work; transforms daily usability. (Sir-stated facts can write at full trust — the quarantine tier is for *external* content.)
10. **Document ingestion.** A Telegram file/PDF handler + the existing Drive sweep upgraded from metadata-stubs to body ingestion (with the provenance/quarantine tags from Wave B4). Route bodies through the consolidator so they become facts + wiki pages, not just blobs. **Voice notes too**: Telegram voice message → Whisper transcription → same capture path — this is the dominant 2026 personal-capture pattern and the cheapest "talk to my second brain" win.
11. **Brief feedback taps.** One-tap 👍/👎/"wrong" per brief item → corrections file that the triage config loader reads. Closes the loop that makes tomorrow's brief better than today's — the single differentiator over a static Gmail filter.
12. **Fill the tier lists** (`JARVIS_VIP_EMAILS`, `JARVIS_FAMILY_EMAILS`, client/investor) — until then needs-you is marketing-keyword regex and will train you to ignore it. 10 minutes of your time, disproportionate payoff.

### P3 — One brain, findable (weeks 2-4)

13. **Unify the wiki roots** into the git-versioned canon (ATLAS-canonical per Wave E), with wiki-lint + SHA256 protection as a real timer. Every surface (voice, brief, dispatcher, consolidators) reads/writes the same root.
14. **Hybrid retrieval**: land the pgvector migration + BM25 + recency fusion behind one `/v1/memory/search`; replace substring wiki search. Freeze the B1 30-question baseline *first*, then require the new retrieval to beat it (your Wave B2 discipline, applied to retrieval instead of a store swap).
15. **Bridge the two fact stores** (one tombstone/TTL semantics, `expires_at` enforced at read, a logged sweeper).
16. **Cross-agent read paths**: brief pulls yesterday's trading lessons + top memory facts; trading agents can query personal constraints (e.g., travel days) read-only. Same dispatcher, same authority gates.

### P4 — Spine before verbs (before any Wave 2 draft capability)

17. `NEVER_AUTO_SEND` as a hardcoded module + bypass-proof test. 18. `GUARDRAILS.md` + HARD BOUNDARY in `IDENTITY.md`, enforced by file ownership + CI diff check. 19. Trifecta-style invariant extended to the dispatcher draft path; ingested subject/snippet always delimited as untrusted data. 20. Desktop gate: per-app denylist (brokers, password managers, 2FA) + Telegram approval instead of file-touch TTL; and kill the advertised-but-ungated buy/sell payloads in `vision-identity` (§4).

### P5 — Vision, resurrected and honest (weeks 3-6)

21. **Split the name**: the desktop trading twin becomes its own profile/charter (or folds into Axe); VISION-the-R&D-lead keeps the no-trading charter. Removes the live contradiction.
22. **Skills into git**: sync `/root/.hermes/profiles/vision/skills/` into the repo (or the wiki canon) so R&D capability survives a desktop failure — this is most of Wave E "Vision resurrection."
23. **Wake the skill-puller** (past its June 9 date) so approved skills actually reach Jarvis — that's the last hop of your recursive skill loop.
24. **Then** turn RUBIX on, shadow-mode, promotions recorded into the ONE Atlas trust ladder, only after 17-18 exist (your audit's own precondition).

### P6 — Substrate and surfaces (ongoing)

25. **Model refresh with the honesty tripwire honored**: Jarvis's daily brain is qwen3-30b with Sonnet 4.6 as the hard-reasoning path; current Claude models (Sonnet 5 / Opus 4.8; Haiku 4.5 for cheap classification) are a straightforward quality lift on the frontier path — update `substrate.json` + personas together so the tripwire stays green, and keep model IDs consistent (the 4.5/4.6 drift already causes cost-lookup misses in `prices.yaml`).
26. **Second two-way surface**: you're one Telegram outage from mute. The Discord bot stub already exists; promote it to a real gateway, or expose the Hermes profile over the MCP server you already run (it's OAuth-ready for Claude clients — this session is proof the Jarvis MCP works remotely).
27. **Multi-account email** (the two gmail.com tokens) once the staleness contract exists, so coverage claims stay honest. Consider the Google-managed Workspace MCP servers (GA since Cloud Next '26) instead of extending the hand-rolled OAuth puller — maintained connectors, same read-only scopes.
28. **On the ATLAS/OpenClaw side**: enable the built-in `dreaming` consolidation pass (disabled by default, human-reviewed via DREAMS.md) and evaluate the `memory-lancedb` plugin as the hybrid-retrieval index over `memory-core` — both are config-level upgrades that mirror your Wave B goals natively.

---

## 8. Ready-to-queue command wave (for your approval)

Once the pollers are back (P0.1 is manual — SSH), these are queue-ready in your WAVE style, each ≤6-min budget, atomic, idempotent:

- **WAVE-F1** — Queue-liveness deadman: cron script alerting when oldest pending command >30 min; canonical copy in `infra/vps-scripts/`; commit.
- **WAVE-F2** — Memory deadman v2: content-based check (dated memory file OR Hindsight episode-count delta in 24h) → Telegram alert; commit.
- **WAVE-F3** — On-host consolidation verification: env check (`ANTHROPIC_API_ALLOWED`), one forced run, assert `jarvis.memory_facts` delta > 0, report count.
- **WAVE-F4** — Self-audit honesty: pull script into git, non-PASS ⇒ non-NOMINAL + exit 1; re-run once; report verdict.
- **WAVE-F5** — Brief staleness contract: ingest exits nonzero on API failure; STALE/error lines; scoped footer; tests; deploy to Hostinger.
- **WAVE-F6** — Telegram `remember:` capture → Hindsight + wiki `_inbox/`, provenance `source=sir/telegram`; smoke test with one fact; report recall.
- **WAVE-F7** — Brief feedback taps → corrections file → loader; prove composition changes next brief.
- **WAVE-F8** — Branch consolidation: reconcile the four stale branches into main behind CI; report conflicts rather than force-resolving.

(P4/P5 items are bigger than queue-command size and deserve worked branches + PRs.)

---

## 9. Research appendix — July 2026 sources

**Anthropic (primary docs):**
- Memory tool (GA, `memory_20250818`): https://platform.claude.com/docs/en/agents-and-tools/tool-use/memory-tool
- Context editing (server-side clearing/compaction): https://platform.claude.com/docs/en/build-with-claude/context-editing and https://www.anthropic.com/news/context-management
- Managed Agents memory stores (versioned, read-only shared stores, 100kB/memory, injection warning): https://platform.claude.com/docs/en/managed-agents/memory
- "Dreams" sleep-time consolidation (non-destructive output stores): https://platform.claude.com/docs/en/managed-agents/dreams
- Context engineering + long-running harnesses: https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents, https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents

**OpenClaw (ATLAS runtime):**
- Memory concepts (MEMORY.md, daily notes, memory flush, dreaming): https://docs.openclaw.ai/concepts/memory (GitHub mirror: openclaw/openclaw/docs/concepts/memory.md)
- memory-lancedb plugin: https://docs.openclaw.ai/plugins/memory-lancedb; LanceDB write-up: https://www.lancedb.com/blog/openclaw-memory-from-zero-to-lancedb-pro
- memory-lancedb-pro (hybrid RRF + rerank + decay): https://github.com/CortexReach/memory-lancedb-pro
- Releases (2026.2.25 heartbeat switch; 2026.3.31 "Task Brain"; 2026.7.1 beta memory-repair fixes): https://github.com/openclaw/openclaw/releases

**Memory architectures:**
- Graphiti temporal knowledge graph (bitemporal validity, hybrid retrieval, MCP server): https://github.com/getzep/graphiti
- Letta sleep-time compute: https://www.letta.com/blog/sleep-time-compute/
- Benchmark wars (why vendor numbers don't transfer): https://github.com/getzep/zep-papers/issues/5, https://blog.getzep.com/lies-damn-lies-statistics-is-mem0-really-sota-in-agent-memory/

**Ingestion:**
- Google-managed Workspace MCP servers (GA, Cloud Next '26): https://cloud.google.com/blog/products/ai-machine-learning/google-managed-mcp-servers-are-available-for-everyone, https://developers.google.com/workspace/guides/configure-mcp-servers
- Community Workspace MCP (self-host option): https://github.com/taylorwilsdon/google_workspace_mcp

**Recursive self-improvement:**
- ICLR 2026 RSI workshop (eval-gated lesson consolidation consensus): https://iclr.cc/virtual/2026/workshop/10000796
- Skill-learning evidence (curated helps, unreviewed degrades): https://openreview.net/forum?id=OsPQ6zTQXV, https://arxiv.org/pdf/2604.20087
- Learnings-loop pattern (learnings.md + periodic compaction): https://www.mindstudio.ai/blog/how-to-build-learnings-loop-claude-code-skills

---

*Prepared by Claude (session of 2026-07-11) for Chris O'Toole. Cross-repo findings reference `O2leGit/ikigaios-jarvis-core` @ main `6ca5425`; line numbers cited throughout are from that commit.*
