# IkigaiTradeOS — Local Hosting Setup Guide

This guide walks you through running IkigaiTradeOS entirely on your local machine.

---

## Prerequisites

Install these before starting:

| Tool | Version | Download |
|---|---|---|
| Node.js | 20+ (LTS) | https://nodejs.org |
| pnpm | 10+ | `npm install -g pnpm` |
| MySQL | 8.0+ | https://dev.mysql.com/downloads/ |

> **Alternative to local MySQL:** Use a free cloud MySQL. [TiDB Cloud](https://tidbcloud.com) and [PlanetScale](https://planetscale.com) both have free tiers that work with this app.

---

## Step 1 — Create the Database

```bash
# Log into MySQL
mysql -u root -p

# Create the database
CREATE DATABASE ikigai_trade_os;
EXIT;
```

---

## Step 2 — Configure Environment Variables

Create a `.env` file in the project root:

```bash
cp .env.template .env
```

Then edit `.env` and fill in:

```env
# REQUIRED — your MySQL connection string
DATABASE_URL=mysql://root:YOUR_PASSWORD@localhost:3306/ikigai_trade_os

# REQUIRED — random secret for session cookies (32+ chars)
# Generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
JWT_SECRET=your-random-secret-here

# OPTIONAL — Manus OAuth (see "Authentication" section below)
VITE_APP_ID=
OAUTH_SERVER_URL=https://api.manus.im
VITE_OAUTH_PORTAL_URL=https://manus.im
OWNER_OPEN_ID=
OWNER_NAME=

# OPTIONAL — leave blank if not using Manus LLM/storage APIs
BUILT_IN_FORGE_API_URL=
BUILT_IN_FORGE_API_KEY=
VITE_FRONTEND_FORGE_API_KEY=
VITE_FRONTEND_FORGE_API_URL=

# OPTIONAL — cosmetic
VITE_APP_TITLE=IkigaiTradeOS Market Intelligence
VITE_APP_LOGO=
VITE_ANALYTICS_ENDPOINT=
VITE_ANALYTICS_WEBSITE_ID=
```

---

## Step 3 — Install Dependencies

```bash
cd ikigai-trade-os
pnpm install
```

---

## Step 4 — Run Database Migrations

```bash
pnpm drizzle-kit generate
pnpm drizzle-kit migrate
```

This creates all tables: `users`, `account_uploads`, `equity_positions`, `options_positions`, `critical_actions`.

---

## Step 5 — Start the Development Server

```bash
pnpm dev
```

The app runs at: **http://localhost:3000**

Both the frontend (Vite/React) and backend (Express/tRPC) are served from the same port.

---

## Step 6 — Open the Dashboard

Navigate to **http://localhost:3000** in your browser.

The dashboard loads immediately with the current briefing data. No login required to view the briefing — authentication is only needed for the Upload Positions page.

---

## Authentication

The app uses Manus OAuth by default. To use it locally:

1. Register at [manus.im](https://manus.im) and create an OAuth application
2. Set `VITE_APP_ID` to your app's client ID
3. Set `OWNER_OPEN_ID` and `OWNER_NAME` to your Manus account details

**To skip authentication entirely (local-only mode):**

Edit `server/routers.ts` and change `protectedProcedure` to `publicProcedure` on the `accounts.uploadCsv` mutation. This removes the login requirement for the CSV upload page.

---

## Port

The app runs on **port 3000** by default.

To change the port, set the `PORT` environment variable:

```bash
PORT=8080 pnpm dev
```

---

## Production Build

To build for production and run the compiled output:

```bash
pnpm build
pnpm start
```

The production server also runs on port 3000 (or `$PORT`).

---

## Updating the Daily Briefing

The briefing data lives in:
```
client/src/lib/briefingData.ts
```

Each morning, update this file with fresh market data. The structure is documented in:
```
(see the ikigai-daily-briefing skill reference files if you have them)
```

After updating `briefingData.ts`, the Vite dev server hot-reloads automatically — no restart needed.

---

## CSV Upload (Local)

The Upload Positions page at **http://localhost:3000/upload** works fully locally.

Drag-and-drop your TOS/TD Ameritrade account statement CSVs into the drop zones. The server parses them and stores positions in your local MySQL database. The Portfolio Review section updates immediately.

---

## Live Ticker Strip

The ticker strip polls Yahoo Finance via the `/api/trpc/market.tickers` endpoint every 30 seconds. This works without any API key — it uses Yahoo Finance's public quote endpoint.

Tickers tracked: NVDA, PLTR, GDX, SLV, USO, ADBE, ULTA, ORCL, VIX, GOLD

---

## Folder Structure

```
ikigai-trade-os/
├── client/                 ← React frontend (Vite)
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Home.tsx        ← Main dashboard (all 11 sections)
│   │   │   ├── Archive.tsx     ← Historical briefings
│   │   │   └── Upload.tsx      ← CSV drag-and-drop upload
│   │   ├── lib/
│   │   │   ├── briefingData.ts ← TODAY'S BRIEFING DATA (update daily)
│   │   │   └── archiveData.ts  ← Historical briefing archive
│   │   ├── components/         ← Shared UI components
│   │   └── index.css           ← Global dark theme styles
│   └── index.html
├── server/                 ← Express + tRPC backend
│   ├── routers.ts          ← All tRPC procedures
│   ├── csvParser.ts        ← TOS CSV parser
│   ├── accountDb.ts        ← Database helpers for accounts
│   └── db.ts               ← Core DB helpers
├── drizzle/
│   └── schema.ts           ← Database schema (source of truth)
├── shared/                 ← Types shared between client and server
├── package.json
├── LOCAL_SETUP.md          ← This file
├── LAYOUT_PREFERENCES.md   ← Dashboard layout contract (do not modify)
└── todo.md                 ← Feature and bug tracking
```

---

## Troubleshooting

**"Cannot connect to database"**
- Verify MySQL is running: `mysql.server start` (macOS) or `sudo systemctl start mysql` (Linux)
- Check `DATABASE_URL` in `.env` — password and database name must match exactly

**"Port 3000 already in use"**
- Kill the process: `lsof -ti:3000 | xargs kill -9`
- Or use a different port: `PORT=3001 pnpm dev`

**Ticker strip shows "—" for all prices**
- Yahoo Finance rate-limits aggressive polling. Wait 60 seconds and refresh.
- The strip retries automatically every 30 seconds.

**CSV upload fails to parse**
- Ensure the file is a TOS/TD Ameritrade account statement export (not a trade history or tax document)
- The file must be named `*-AccountStatement-{ID}.csv` or the account ID must be selected manually in the drop zone
