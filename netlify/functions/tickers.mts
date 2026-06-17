import type { Context } from "@netlify/functions";
import { fetchQuote, stock, type SymbolSpec } from "../../shared/marketProviders";

// Ticker strip symbols. The 8 equities/ETFs resolve via any configured provider
// (Finnhub/Twelve Data/Polygon) with Yahoo fallback; ^VIX and gold futures have
// no confident provider symbol, so they stay Yahoo-only. The output `symbol`
// keeps the original raw ticker the client expects.
const TICKERS: SymbolSpec[] = [
  stock("NVDA"),
  stock("PLTR"),
  stock("GDX"),
  stock("SLV"),
  stock("USO"),
  stock("ADBE"),
  stock("ULTA"),
  stock("ORCL"),
  { yahoo: "^VIX", name: "VIX" },
  { yahoo: "GC=F", name: "Gold" },
];

export default async (_req: Request, _context: Context) => {
  const results = await Promise.allSettled(TICKERS.map((spec) => fetchQuote(spec)));
  const tickers = results.map((r, i) => {
    const sym = TICKERS[i].yahoo;
    if (r.status === "fulfilled" && r.value) {
      const q = r.value;
      return {
        symbol: sym,
        price: q.price,
        change: q.change,
        changePercent: q.changePercent,
        name: q.name ?? sym,
      };
    }
    return { symbol: sym, price: 0, change: 0, changePercent: 0, name: sym };
  });

  return new Response(JSON.stringify(tickers), {
    headers: { "Content-Type": "application/json", "Cache-Control": "public, max-age=30" },
  });
};
