import type { Context } from "@netlify/functions";
import { fetchQuote, type SymbolSpec } from "../../shared/marketProviders";

// "Market Environment" levels. These are indices/futures/FX/crypto -- only BTC
// has a confident cross-provider symbol (Twelve Data BTC/USD); the rest have no
// reliable Finnhub/Twelve Data/Polygon ticker, so they stay Yahoo-only (mapping
// them to a wrong-but-valid provider symbol would show wrong levels). Add
// provider symbols here once verified against the live provider.
const SYMBOLS: (SymbolSpec & { asset: string })[] = [
  { asset: "S&P 500 Futures", yahoo: "^GSPC" },
  { asset: "Nasdaq Futures", yahoo: "^IXIC" },
  { asset: "Dow Futures", yahoo: "^DJI" },
  { asset: "VIX", yahoo: "^VIX" },
  { asset: "WTI Crude", yahoo: "CL=F" },
  { asset: "10Y Treasury", yahoo: "^TNX" },
  { asset: "Gold", yahoo: "GC=F" },
  { asset: "Silver", yahoo: "SI=F" },
  { asset: "US Dollar (DXY)", yahoo: "DX-Y.NYB" },
  { asset: "Bitcoin", yahoo: "BTC-USD", twelvedata: "BTC/USD" },
];

function formatLevel(price: number): string {
  return price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatChange(change: number, changePercent: number): string {
  const sign = change >= 0 ? "+" : "";
  return `${sign}${change.toFixed(2)} (${sign}${changePercent.toFixed(2)}%)`;
}

function getDirection(change: number): "up" | "down" | "flat" {
  if (change > 0) return "up";
  if (change < 0) return "down";
  return "flat";
}

export default async (_req: Request, _context: Context) => {
  const results = await Promise.allSettled(SYMBOLS.map((s) => fetchQuote(s)));
  const marketData = results.map((r, i) => {
    const { asset } = SYMBOLS[i];
    if (r.status === "fulfilled" && r.value) {
      const { price, change, changePercent } = r.value;
      return {
        asset,
        level: formatLevel(price),
        change: formatChange(change, changePercent),
        direction: getDirection(change),
      };
    }
    return { asset, level: "0.00", change: "+0.00 (+0.00%)", direction: "flat" as const };
  });

  return new Response(JSON.stringify(marketData), {
    headers: { "Content-Type": "application/json", "Cache-Control": "public, max-age=60" },
  });
};
