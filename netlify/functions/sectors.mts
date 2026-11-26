import type { Context } from "@netlify/functions";
import { fetchQuote, stock } from "../../shared/marketProviders";

// 11 GICS sector ETFs with day-change and LEADING/LAGGING status.
// Quotes come from the shared multi-provider chain (Finnhub -> Twelve Data ->
// Polygon -> Yahoo) instead of Yahoo-direct only, which is blocked from most
// serverless IPs and silently zeroed the whole heatmap.

const SECTOR_ETFS: { ticker: string; sector: string }[] = [
  { ticker: "XLE", sector: "Energy" },
  { ticker: "XLK", sector: "Technology" },
  { ticker: "XLF", sector: "Financials" },
  { ticker: "XLV", sector: "Healthcare" },
  { ticker: "XLU", sector: "Utilities" },
  { ticker: "XLY", sector: "Consumer Discretionary" },
  { ticker: "XLP", sector: "Consumer Staples" },
  { ticker: "XLI", sector: "Industrials" },
  { ticker: "XLB", sector: "Materials" },
  { ticker: "XLRE", sector: "Real Estate" },
  { ticker: "XLC", sector: "Communication Services" },
];

function getStatus(changePercent: number): "LEADING" | "NEUTRAL" | "LAGGING" {
  if (changePercent > 1) return "LEADING";
  if (changePercent < -1) return "LAGGING";
  return "NEUTRAL";
}

function formatPct(changePercent: number): string {
  const sign = changePercent >= 0 ? "+" : "";
  return `${sign}${changePercent.toFixed(1)}%`;
}

export default async (_req: Request, _context: Context) => {
  const results = await Promise.allSettled(
    SECTOR_ETFS.map((s) => fetchQuote(stock(s.ticker, s.sector))),
  );
  const sectors = results.map((r, i) => {
    const { ticker, sector } = SECTOR_ETFS[i];
    if (r.status === "fulfilled" && r.value) {
      const { price, changePercent } = r.value;
      const formatted = formatPct(changePercent);
      return {
        sector,
        ticker,
        price,
        changePercent: parseFloat(changePercent.toFixed(2)),
        // Day-change string. `ytd` is kept as a deprecated alias -- the value
        // was ALWAYS the 1-day change (range=1d), never year-to-date; older
        // clients read it under that name.
        dayChange: formatted,
        ytd: formatted,
        status: getStatus(changePercent),
      };
    }
    return {
      sector, ticker, price: 0, changePercent: 0,
      dayChange: "+0.0%", ytd: "+0.0%", status: "NEUTRAL" as const,
    };
  });

  return new Response(JSON.stringify(sectors), {
    headers: { "Content-Type": "application/json", "Cache-Control": "public, max-age=60" },
  });
};
