# IkigaiTradeOS Market Intelligence — TODO

## Core Architecture
- [x] Global dark theme with institutional design system (index.css)
- [x] briefingData.ts — full data schema with live market data
- [x] archiveData.ts — historical briefing archive
- [x] App.tsx routing (Home + Archive pages)
- [x] Server router: live ticker price polling (Yahoo Finance proxy)

## Dashboard Features
- [x] Live market ticker strip (NVDA, PLTR, GDX, SLV, USO, ADBE, ULTA, ORCL, VIX, GOLD) — 30s polling
- [x] Section 01: Executive View
- [x] Section 02: Market Environment (macro conditions table)
- [x] Section 03: News & Sentiment signals
- [x] Section 04: Event Risk Calendar (next 5 trading days)
- [x] Section 05: Sector Rotation heatmap (11 GICS sectors)
- [x] Section 06: Seasonal Context
- [x] Section 07: Prior Session Grades (letter grades A-F)
- [x] Section 08: Earnings Plays calendar
- [x] Section 09: Trading Ideas (TODAY / THIS WEEK / THIS MONTH)
- [x] Section 10: Portfolio Review (5 accounts: 195, 370, 676, 927, StratModel)
- [x] Section 11: Decision Summary

## Portfolio Features
- [x] Account cards: NLV, open P&L, YTD P&L
- [x] Equity positions table per account
- [x] Options positions table per account
- [x] Critical actions alerts
- [x] Cross-account risk analysis panel
- [x] Account history equity curve chart

## Market Regime System
- [x] VIX-based regime badge (RISK-ON/RISK-OFF/NEUTRAL/CAUTION/CRISIS)
- [x] Regime description and best strategies display

## Archive Page
- [x] Historical briefings list with regime badges
- [x] Regime sparkline visualization
- [x] Searchable briefing history

## Data Population
- [x] Populate briefingData.ts with live March 13, 2026 market data
- [x] Populate archiveData.ts with archive entries
- [x] Parse and integrate account CSV data (195, 370, 676, 927, StratModel)

## Quality Checks
- [x] TypeScript compiles clean (npx tsc --noEmit)
- [x] Validate briefing date = Friday, March 13, 2026
- [x] Vitest tests pass (10/10)

## Update — March 13, 2026 Post-PCE Refresh
- [x] Rebuild Home.tsx with sidebar layout matching screenshot (left nav + main content)
- [x] Update briefingData.ts with live PCE data (Core PCE +0.4% MoM / +3.1% YoY, GDP Q4 revised to 0.7%)
- [x] Add exact position sizing to all trading ideas (shares/contracts, dollar risk, % of NLV)
- [x] Add Friday Weekly Analysis section (week review + next week preview)
- [x] Update Executive View with post-PCE stagflation narrative
- [x] Update Decision Summary with post-PCE regime implications

## Update — Remove Equity Curve Chart
- [x] Remove Account Equity Curve chart from Portfolio Review section

## Update — Portfolio Review Layout Fix
- [x] Remove Account Equity Curve chart from Portfolio Review section
- [x] Restore tab-based account switcher (pill buttons at top, one account shown at a time)
- [x] Restore large NLV / Open P&L / YTD P&L header display
- [x] Restore Critical Actions Required panel with amber styling

## Update — All Three Next Steps
- [x] Add combined portfolio summary row (total NLV, open P&L, risk score) above account tabs
- [x] Lock in layout with structural vitest tests (all 11 sections, portfolio tab switcher, summary row)
- [x] Set up 6 AM CT weekday scheduled task for auto daily briefing pipeline
- [x] Save checkpoint and publish site

## Update — Sector Rotation Redesign + Layout Lock-in
- [x] Redesign Sector Rotation with graphical heatmap tiles, performance bars, momentum arrows
- [x] Add combined portfolio summary row above account tabs (total NLV $541,849, open P&L +$11,097)
- [x] Add structural vitest tests locking in all 11 section IDs, portfolio tab switcher, summary row
- [x] Set up 6 AM CT weekday scheduled task
- [x] Save checkpoint and publish

## Fix — Sector Rotation Layout
- [x] Restore clean list layout (sector + YTD + badge + note per row) with performance bar background and color-coded left border

## Layout Lock-In
- [x] Write LAYOUT_PREFERENCES.md with all confirmed UI preferences
- [x] Update skill SKILL.md with layout contract and daily process rules
- [x] Save final checkpoint

## Feature — CSV Drag-and-Drop Upload Panel
- [x] Database schema: account_uploads, equity_positions, options_positions tables
- [x] Server CSV parser tRPC procedure (multipart upload → parse → store)
- [x] Upload page UI: drag-and-drop zone per account, parse status, position preview
- [x] Portfolio Review wired to live DB data (falls back to briefingData.ts if no upload)
- [x] Upload nav link in sidebar
- [x] Vitest tests for CSV parser and DB procedures
