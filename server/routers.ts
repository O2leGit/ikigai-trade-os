import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { z } from "zod";
import {
  getLatestUploads,
  getUploadStatus,
  insertCriticalActions,
  insertEquityPositions,
  insertOptionsPositions,
  upsertAccountUpload,
} from "./accountDb";
import { parseTosAccountCsv } from "./csvParser";

// ─── YAHOO FINANCE ────────────────────────────────────────────────────────────
async function fetchYahooQuote(symbol: string): Promise<{
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  name: string;
} | null> {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1m&range=1d`;
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "application/json",
      },
    });
    if (!res.ok) return null;
    const data = await res.json();
    const meta = data?.chart?.result?.[0]?.meta;
    if (!meta) return null;
    const price = meta.regularMarketPrice ?? meta.previousClose ?? 0;
    const prevClose = meta.chartPreviousClose ?? meta.previousClose ?? price;
    const change = price - prevClose;
    const changePercent = prevClose !== 0 ? (change / prevClose) * 100 : 0;
    return {
      symbol,
      price,
      change,
      changePercent,
      name: meta.shortName ?? meta.symbol ?? symbol,
    };
  } catch {
    return null;
  }
}

const TICKER_SYMBOLS = ["NVDA", "PLTR", "GDX", "SLV", "USO", "ADBE", "ULTA", "ORCL", "^VIX", "GC=F"];

// ─── ROUTER ───────────────────────────────────────────────────────────────────
export const appRouter = router({
  system: systemRouter,

  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  market: router({
    tickers: publicProcedure.query(async () => {
      const results = await Promise.allSettled(
        TICKER_SYMBOLS.map((sym) => fetchYahooQuote(sym))
      );
      return results
        .map((r, i) => {
          if (r.status === "fulfilled" && r.value) return r.value;
          return {
            symbol: TICKER_SYMBOLS[i],
            price: 0,
            change: 0,
            changePercent: 0,
            name: TICKER_SYMBOLS[i],
          };
        })
        .filter(Boolean);
    }),

    quote: publicProcedure
      .input(z.object({ symbol: z.string() }))
      .query(async ({ input }) => {
        return fetchYahooQuote(input.symbol);
      }),
  }),

  // ─── ACCOUNTS ─────────────────────────────────────────────────────────────
  accounts: router({
    /**
     * Upload and parse a TOS/TD Ameritrade CSV for a single account.
     * Protected: only authenticated users can upload.
     */
    uploadCsv: protectedProcedure
      .input(
        z.object({
          accountId: z.string(),
          csvContent: z.string().min(10), // raw CSV text
        })
      )
      .mutation(async ({ input }) => {
        const { accountId, csvContent } = input;

        // Parse the CSV
        const parsed = parseTosAccountCsv(csvContent, accountId);

        // Store the upload record
        const uploadId = await upsertAccountUpload({
          accountId: parsed.accountId,
          accountName: parsed.accountName,
          accountType: parsed.accountType,
          statementDate: parsed.statementDate,
          nlv: String(parsed.nlv),
          openPnl: String(parsed.openPnl),
          ytdPnl: String(parsed.ytdPnl),
          rawCsv: csvContent,
        });

        // Store equity positions
        if (parsed.equity.length > 0) {
          await insertEquityPositions(
            parsed.equity.map((p) => ({
              uploadId,
              accountId: parsed.accountId,
              symbol: p.symbol,
              quantity: String(p.quantity),
              avgCost: p.avgCost !== null ? String(p.avgCost) : null,
              mark: p.mark !== null ? String(p.mark) : null,
              openPnl: p.openPnl !== null ? String(p.openPnl) : null,
              openPnlPct: p.openPnlPct !== null ? String(p.openPnlPct) : null,
              action: "HOLD",
              rationale: null,
            }))
          );
        }

        // Store options positions
        if (parsed.options.length > 0) {
          await insertOptionsPositions(
            parsed.options.map((p) => ({
              uploadId,
              accountId: parsed.accountId,
              symbol: p.symbol,
              underlying: p.underlying,
              expiry: p.expiry,
              strike: p.strike !== null ? String(p.strike) : null,
              optionType: p.optionType,
              quantity: String(p.quantity),
              avgCost: p.avgCost !== null ? String(p.avgCost) : null,
              mark: p.mark !== null ? String(p.mark) : null,
              openPnl: p.openPnl !== null ? String(p.openPnl) : null,
              action: "HOLD",
              rationale: null,
            }))
          );
        }

        return {
          success: true,
          uploadId,
          accountId: parsed.accountId,
          accountName: parsed.accountName,
          statementDate: parsed.statementDate,
          nlv: parsed.nlv,
          openPnl: parsed.openPnl,
          equityCount: parsed.equity.length,
          optionsCount: parsed.options.length,
        };
      }),

    /**
     * Get upload status for all 5 accounts (for the upload panel status cards).
     */
    uploadStatus: publicProcedure.query(async () => {
      return getUploadStatus();
    }),

    /**
     * Get the latest parsed positions for all accounts (for Portfolio Review).
     */
    latestPositions: publicProcedure.query(async () => {
      return getLatestUploads();
    }),
  }),
});

export type AppRouter = typeof appRouter;
