# IkigaiTradeOS — Layout Preferences & Daily Process Contract

**Last confirmed:** March 13, 2026 — Vol. I Issue 003  
**Checkpoint locked:** `7aef3e00`  
**Status:** LOCKED — do not modify layout structure without explicit user instruction

---

## GLOBAL LAYOUT CONTRACT

This document is the authoritative source of truth for the IkigaiTradeOS dashboard layout. Every daily briefing update MUST preserve these exact structural decisions. Do not redesign, refactor, or "improve" any section without explicit user approval.

### Top-Level Structure

The dashboard uses a **two-panel layout**:

| Panel | Width | Contents |
|---|---|---|
| Left sidebar | ~256px fixed | Navigation, date/issue, regime badge |
| Main content area | Remaining width | All 11 briefing sections |

The sidebar is **always visible** and does not collapse on desktop. The main content area scrolls independently.

### Ticker Strip

A live scrolling ticker strip sits at the very top of the page, above both panels. It polls Yahoo Finance every 30 seconds for: `NVDA, PLTR, GDX, SLV, USO, ADBE, ULTA, ORCL, VIX, GOLD`. Prices show green (up) or red (down) with percentage change. This strip is **always present** and never removed.

### Sidebar Contents (top to bottom)

1. **IkigaiTradeOS logo + "MARKET INTELLIGENCE" subtitle** — top-left corner
2. **Date/Issue card** — shows current briefing date, Vol. I — Issue NNN
3. **Navigation items** (11 total, in this exact order):
   - Executive View
   - Market Environment
   - News & Sentiment
   - Event Risk Calendar
   - Sector Rotation
   - Seasonal Context
   - Prior Session Grades
   - Earnings Plays
   - Trading Ideas
   - Portfolio Review
   - Decision Summary
4. **Briefing Archive** link — below the 11 nav items, separated by a divider
5. **CURRENT REGIME badge** — pinned at the bottom of the sidebar, color-coded by regime

Active nav item is highlighted with a teal/green left border and background.

---

## SECTION-BY-SECTION LAYOUT RULES

### Section 01 — Executive View
- Full-width text block in a bordered card
- No sub-sections, no columns
- Plain paragraph text, no bullet points
- Includes Friday Weekly Analysis paragraph on Fridays only

### Section 02 — Market Environment
- **Market Snapshot grid**: 4-column grid of stat cards (asset name, price level, change with up/down color)
- **Macro Conditions**: vertical list of expandable cards (title + status badge + body text)
- **Regime Classification**: dedicated card with classification label, description, and strategy list

### Section 03 — News & Sentiment
- **News Signals**: vertical list of cards — headline (bold), source, sentiment badge (BULLISH/BEARISH/NEUTRAL), impact badge (CRITICAL/HIGH/MEDIUM/LOW), detail text
- **Sentiment Summary**: 4-column grid showing Overall, WSB, Twitter/X, StockTwits with a Key Theme note below

### Section 04 — Event Risk Calendar
- Table layout: Date | Event | Time | Impact | Notes
- Impact badges: CRITICAL (red), HIGH (orange), MEDIUM (yellow), LOW (gray)
- Events sorted chronologically for the next 5 trading days

### Section 05 — Sector Rotation ⭐ LOCKED
**This is the confirmed layout — do not change:**
- Vertical list of rows, one per sector (11 total)
- Each row: `[sector name + YTD%]` | `[LEADING/NEUTRAL/LAGGING badge]` | `[note text]`
- Color-coded **left border** per row: green=LEADING, yellow=NEUTRAL, red=LAGGING
- Subtle **performance bar wash** behind each row (opacity 6%, proportional to YTD absolute value)
- Sectors sorted: LEADING first (descending YTD), then NEUTRAL, then LAGGING (most negative last)
- **NO** interactive heatmap tiles, **NO** bar chart panel, **NO** click-to-expand — just the clean list

### Section 06 — Seasonal Context
- Vertical list of cards: title + status badge + body text
- On Fridays: includes a "Week in Review" and "Next Week Preview" card
- On non-Fridays: standard seasonal pattern cards only

### Section 07 — Prior Session Grades
- Table layout: Ticker | Direction | Grade (A-F) | Result | Est. P&L | Lesson
- Grade badges: A/B = green, C = yellow, D/F = red
- Lessons column is a brief sentence, not a paragraph

### Section 08 — Earnings Plays
- Card per earnings play: ticker + company name + date + time (BMO/AMC)
- Each card shows: EPS consensus, revenue consensus, implied move %, whisper number
- Bull case / Bear case as two short lines
- Trade structure recommendation at the bottom of each card

### Section 09 — Trading Ideas ⭐ LOCKED
**This is the confirmed layout — do not change:**
- Three tabs: TODAY | THIS WEEK | THIS MONTH
- Each idea card shows:
  - Ticker (large, colored by direction)
  - Direction badge (LONG=green, SHORT=red)
  - Conviction badge (HIGH/MEDIUM-HIGH/MEDIUM/LOW)
  - Thesis paragraph
  - Key Levels row: Entry | Target | Stop
  - **Sizing row**: exact shares/contracts, dollar risk, % of NLV — this is REQUIRED
  - Risk/Invalidation note

### Section 10 — Portfolio Review ⭐ LOCKED
**This is the confirmed layout — do not change:**

**Combined Summary Row** (above account tabs):
- Total NLV across all 5 accounts
- Total Open P&L
- Total YTD P&L
- Regime Risk Score (0-100 with label: LOW/MODERATE/ELEVATED/HIGH/EXTREME)
- Per-account NLV proportion bars (horizontal, color-coded, doubles as visual reference)

**Account Tab Pills** (horizontal row):
- One pill per account in this order: StratModel (Paper Account) | 676 (Rollover IRA) | 195 (Roth IRA) | 370 (Individual) | 927 (Joint Tenant)
- Active tab is highlighted with gold/amber border
- Clicking a tab switches the account view below

**Per-Account View** (one account shown at a time):
- Header: Account name (large) + account type subtitle + NLV (large gold) + Open P&L + YTD P&L
- Summary paragraph: 2-3 sentence narrative of the account's current state
- **Critical Actions Required** panel (amber border, amber triangle icon) — numbered list of urgent actions
- **Equity Positions table**: Symbol | Shares | Avg Cost | Mark | Open P&L | Action | Rationale
  - Symbol is gold/amber colored
  - Open P&L is green (positive) or red (negative)
  - Action badge: HOLD (gray) | ADD (green) | TRIM (amber) | EXIT (red) | HOLD/TRIM (split)
- **Options Positions table** (if present): Symbol | Expiry | Strike/Type | Qty | Mark | Open P&L | Action | Rationale
- **NO** equity curve chart — this was explicitly removed

### Section 11 — Decision Summary
- Three cards side by side: Best Opportunity Today | Best Swing Idea This Week | Biggest Risk to Watch
- Each card: title + ticker/asset + brief rationale
- Color coding: opportunity=green, swing=teal, risk=red

---

## DAILY UPDATE PROCESS — WHAT CHANGES vs. WHAT STAYS FIXED

### What CHANGES every day (data only):
- All prices, levels, and percentage values in MARKET_SNAPSHOT
- Executive View paragraph text
- News signals (NEWS_SIGNALS array)
- Sentiment summary text
- Event calendar (add/remove events, mark released ones)
- Trading ideas (new ideas, updated levels)
- Prior session grades (grade yesterday's ideas)
- Portfolio positions (from uploaded CSVs)
- Decision summary

### What NEVER CHANGES (layout/structure):
- The sidebar navigation order and items
- The two-panel layout
- The ticker strip
- The section numbering (01-11)
- The sector rotation list layout (confirmed above)
- The portfolio review tab structure
- The trading ideas tab structure with sizing
- The color scheme (dark background, gold/teal accents, green=bull, red=bear)

### Friday-Only Additions:
- Week in Review card in Seasonal Context
- Next Week Preview card in Seasonal Context
- Weekly performance summary in Executive View

### Weekend Process:
- Saturday 9 AM CT: Deep week analysis (not a standard daily briefing)
- Sunday 9 AM CT: Pre-week preview and setup

---

## COLOR SCHEME CONTRACT

| Element | Color |
|---|---|
| Background | `#0a0e14` (near-black) |
| Card background | `#0f1520` |
| Border | `#1e2a3a` |
| Accent / gold | `#d4a843` (amber/gold) |
| Bullish / positive | `#22c55e` (green) |
| Bearish / negative | `#ef4444` (red) |
| Teal / active nav | `#14b8a6` |
| Text primary | `#e2e8f0` |
| Text muted | `#64748b` |

---

## ACCOUNT MAPPING

| Account ID | Name | Type |
|---|---|---|
| StratModel | Paper Account | PaperMoney (TD Ameritrade) |
| 676 | Account 676 | Rollover IRA |
| 195 | Account 195 | Roth IRA |
| 370 | Account 370 | Individual |
| 927 | Account 927 | Joint Tenant |

CSV files are uploaded to `/home/ubuntu/upload/` with naming pattern `YYYY-MM-DD-AccountStatement-{ID}.csv`.

---

## VITEST LAYOUT LOCK TESTS

The file `server/layout.test.ts` contains 28 structural tests that validate:
- All 11 briefing sections have required data fields
- MARKET_SNAPSHOT has ≥6 entries with `asset`, `level`, `change` fields
- SECTOR_ROTATION has exactly 11 sectors with `sector`, `ytd`, `status`, `note` fields
- All 5 accounts are present with required NLV/P&L fields
- All trading ideas have `sizing` field with exact position size
- Conviction ratings are valid values only

**These tests must pass (41/41) before every checkpoint save.** If a test fails, fix the data — do not modify the tests to match broken data.
