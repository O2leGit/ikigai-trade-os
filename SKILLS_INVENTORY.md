# Skills Inventory

> A complete, organized inventory of every Claude skill, plugin, and slash command
> available across Cowork (claude.ai), Claude Code, and this repository.
> Last audited: 2026-07-11 (from a Claude Code remote session).
>
> Open this file in VS Code from the repo root: `code SKILLS_INVENTORY.md`

---

## 1. Cowork / Claude.ai Skills (account-level)

These are enabled on the claude.ai account and available in Cowork and claude.ai chats.
Manage them at **claude.ai → Settings → Capabilities**.

| Skill | What it does |
|---|---|
| `step-by-step-intake` | Structured one-at-a-time question intake for gathering requirements, project setup, scoping, and onboarding flows. Triggers when 3+ pieces of info are needed ("walk me through", "ask me one at a time"). |
| `skill-creator` | Create new skills, improve existing ones, run evals/benchmarks on skill performance, and optimize skill descriptions for better triggering. |
| `xlsx` | Read, create, edit, fix, and convert spreadsheets (.xlsx, .xlsm, .xltx, .csv, .tsv) — formulas, formatting, charts, and cleaning messy tabular data. |
| `pptx` | Create, read, edit, merge, and split PowerPoint decks (.pptx/.potx), including templates, layouts, speaker notes, and comments. |
| `pdf` | Everything PDF: extract text/tables, merge/split, rotate, watermark, fill forms, encrypt/decrypt, extract images, OCR scanned documents. |
| `docx` | Create, read, edit, and manipulate Word documents (.docx/.dotx) — reports, memos, letters, templates, tracked changes, find-and-replace. |

## 2. Cowork / Claude.ai Plugins (account-level)

| Plugin | Source | Status | Notes |
|---|---|---|---|
| `operations` | `knowledge-work-plugins` marketplace | Enabled | Knowledge-work operations plugin; no detailed command/skill metadata exposed via the API. |

## 3. Claude Code Skills & Slash Commands (session-level)

Available in Claude Code sessions (CLI, desktop app, web, IDE extensions). Invoke with
`/<name>` or let Claude trigger them automatically.

### Code quality & review

| Skill | What it does |
|---|---|
| `/code-review` | Review the current diff for correctness bugs and cleanup opportunities at a chosen effort level. Supports `--comment` (post inline PR comments) and `--fix` (apply findings). |
| `/review` | Review a GitHub pull request (use `/code-review` for your working diff). |
| `/security-review` | Complete a security review of the pending changes on the current branch. |
| `/simplify` | Review changed code for reuse, simplification, efficiency, and altitude cleanups, then apply the fixes. Quality only — no bug hunting. |
| `/verify` | Verify a code change actually works by exercising it end-to-end and observing behavior — not just tests or typecheck. |

### Project & session management

| Skill | What it does |
|---|---|
| `/init` | Initialize a new CLAUDE.md file with codebase documentation. |
| `/handoff` | Write a HANDOFF.md capturing the current session's work (also defined per-project in this repo — see section 4). |
| `/session-start-hook` | Create SessionStart startup hooks so a repo can run tests and linters in Claude Code on the web sessions. |
| `/update-config` | Configure the Claude Code harness via settings.json — permissions, env vars, hooks, automated behaviors. |
| `/keybindings-help` | Customize keyboard shortcuts and chord bindings in `~/.claude/keybindings.json`. |
| `/fewer-permission-prompts` | Scan transcripts for common read-only calls and add a prioritized allowlist to `.claude/settings.json`. |

### Research & content

| Skill | What it does |
|---|---|
| `/deep-research` | Deep research harness — fan-out web searches, fetch sources, adversarially verify claims, synthesize a cited report. |
| `/dataviz` | Design-system guidance for any chart, graph, dashboard, or data visualization, in any output medium or library. |
| `/artifact-design` | Design guidance and fundamentals for building Artifacts (hosted web pages). |
| `/claude-api` | Reference for the Claude API / Anthropic SDK — model IDs, pricing, params, streaming, tool use, MCP, caching. |

### Automation & execution

| Skill | What it does |
|---|---|
| `/run` | Launch and drive this project's app to see a change working (start, screenshot, confirm behavior in the real app). |
| `/loop` | Run a prompt or slash command on a recurring interval (e.g. `/loop 5m /foo`, defaults to 10m). |

## 4. Project-Level (this repository)

Defined in `ikigai-trade-os/.claude/` and available to anyone working in this repo.

| Item | Path | What it does |
|---|---|---|
| `/handoff` command | `.claude/commands/handoff.md` | Writes a structured `HANDOFF.md` to the project root: completed work, files modified, key decisions, known issues, next steps, and system state (VPS/Railway status, routes, jobs, uptime). Accepts a focus-area argument. |
| Launch config | `.claude/launch.json` | Claude Code launch configuration for this repo. |

## 5. User-Level (remote environment `~/.claude/`)

Present in the Claude Code remote execution environment for this account.

| Item | Path | What it does |
|---|---|---|
| `session-start-hook` skill | `~/.claude/skills/session-start-hook/SKILL.md` | Guide for authoring SessionStart hooks (dependency install, async mode) so tests/linters work in web sessions. |
| Git identity hook | `~/.claude/session-start-git-identity.sh` | SessionStart hook that configures git identity. |
| Stop hooks | `~/.claude/stop-hook-git-check.sh`, `~/.claude/stop-hook-reply-gate.py` | Checks run when a session turn ends (uncommitted-work check, reply gating). |
| Prompt-submit hook | `~/.claude/user-prompt-submit-reply-reminder.py` | Reminder hook that runs when a prompt is submitted. |

## 6. Where Skills Live & How to Manage Them

| Scope | Location | Applies to |
|---|---|---|
| Cowork / claude.ai account | claude.ai → Settings → Capabilities | All Cowork and claude.ai chats |
| Plugins & marketplaces | claude.ai plugin catalog / `/plugin` in Claude Code | Where installed/enabled |
| Claude Code built-ins | Ship with Claude Code | Every Claude Code session |
| User (all projects) | `~/.claude/skills/<name>/SKILL.md`, `~/.claude/commands/<name>.md` | All repos on that machine |
| Project (this repo) | `.claude/skills/<name>/SKILL.md`, `.claude/commands/<name>.md` | Anyone working in this repo |

**To add a new skill to this repo:** create `.claude/skills/<skill-name>/SKILL.md` with
`name` and `description` frontmatter, or `.claude/commands/<name>.md` for a simple slash
command. The `skill-creator` skill (section 1) can scaffold and eval these for you.
