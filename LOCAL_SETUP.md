# IkigaiTradeOS — Local Hosting Setup Guide

This guide walks you through running IkigaiTradeOS locally.

## Architecture

IkigaiTradeOS ships as a **Vite/React single-page app** plus a set of
**Netlify Functions** (in `netlify/functions/`) that back the `/api/*` routes.
There is no database to run locally — stored data (uploaded account
statements, generated briefings, analyses) lives in **Netlify Blobs**, and
market/news data is fetched from public APIs and the external trading
backend.

```
ikigai-trade-os/
├── client/                 ← React frontend (Vite)
│   ├── src/
│   │   ├── pages/          ← Home / Archive / Upload / Engines / ...
│   │   ├── lib/
│   │   │   ├── briefingData.ts ← Static briefing fallback data
│   │   │   └── archiveData.ts  ← Historical briefing archive
│   │   ├── components/         ← Shared UI components
│   │   └── index.css           ← Global dark theme styles
│   └── index.html
├── netlify/functions/      ← Serverless API (/api/* → these functions)
├── shared/                 ← Types/constants shared across the app
├── netlify.toml            ← Build, redirects, security headers
├── LOCAL_SETUP.md          ← This file
├── LAYOUT_PREFERENCES.md   ← Dashboard layout contract (do not modify)
└── todo.md                 ← Feature and bug tracking
```

---

## Prerequisites

| Tool | Version | Download |
|---|---|---|
| Node.js | 20+ (LTS) | https://nodejs.org |
| pnpm | 10+ | `npm install -g pnpm` |
| Netlify CLI | latest | `npm install -g netlify-cli` |

The Netlify CLI is what makes `/api/*` (the functions) work locally with the
same behavior as production.

---

## Step 1 — Install Dependencies

```bash
cd ikigai-trade-os
pnpm install
```

---

## Step 2 — Configure Environment Variables

Copy the template and fill in the values you need:

```bash
cp .env.template .env
```

Only the integrations you actually use need to be configured (e.g. the LLM
and trading-backend API keys for AI analysis and live data). Anything left
blank simply disables that feature locally. Keep all secrets server-side —
only variables prefixed with `VITE_` are exposed to the browser.

---

## Step 3 — Start the Dev Server

```bash
pnpm dev          # runs `netlify dev`
```

`netlify dev` serves the Vite frontend and the functions together and proxies
`/api/*` to `netlify/functions/*`, mirroring production. The app runs at the
URL the CLI prints (typically **http://localhost:8888**).

> Frontend-only preview: `pnpm exec vite` serves the SPA on its own, but the
> `/api/*` calls will fail because no functions are running. Use `netlify dev`
> for the full app.

---

## Step 4 — Build / Typecheck / Test

```bash
pnpm build        # production client build (what Netlify deploys)
pnpm check        # TypeScript typecheck (tsc --noEmit)
pnpm test         # vitest
pnpm format       # prettier
```

Netlify builds the site with `npm run build:client` (see `netlify.toml`) and
publishes `dist/public`.

---

## Updating the Daily Briefing

The static fallback briefing data lives in:

```
client/src/lib/briefingData.ts
```

After updating it, the Vite dev server hot-reloads automatically — no restart
needed.

---

## Live Ticker Strip

The ticker strip polls public market data via the `/api/*` functions. This
works without any API key for the basic quote feed. If all prices show "—",
the upstream provider is rate-limiting; the strip retries automatically.

---

## CSV Upload (Local)

The Upload Positions page at **/upload** works locally under `netlify dev`.
Drag-and-drop your TOS/TD Ameritrade account statement CSVs into the drop
zones. The `save-accounts` / `get-accounts` functions persist the parsed
positions to Netlify Blobs, and the Portfolio Review section updates from
that stored data.

---

## Troubleshooting

**`/api/*` calls return 404 locally**
- You're probably running plain `vite` instead of `netlify dev`. Use `pnpm dev`.

**Ticker strip shows "—" for all prices**
- The upstream quote provider rate-limits aggressive polling. Wait ~60s and
  refresh; the strip retries on its own.

**CSV upload fails to parse**
- Ensure the file is a TOS/TD Ameritrade account statement export (not a
  trade history or tax document), or select the account ID manually in the
  drop zone.
