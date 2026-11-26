import type { Context } from "@netlify/functions";
import { fetchQuote, stock, type SymbolSpec } from "../../shared/marketProviders";

// Single-symbol quote. Uses the shared multi-provider chain
// (Finnhub -> Twelve Data -> Polygon -> Yahoo) instead of Yahoo-direct only:
// Yahoo blocks most serverless IPs, which made this endpoint 502 in production.

function specFor(symbol: string): SymbolSpec {
  // Indices (^VIX), futures (GC=F), FX pairs etc. are Yahoo-namespace symbols
  // the keyed providers don't serve under the same ticker -- Yahoo-only.
  if (/[\^=.]/.test(symbol)) return { yahoo: symbol };
  return stock(symbol);
}

export default async (req: Request, _context: Context) => {
  const url = new URL(req.url);
  const symbol = url.searchParams.get("symbol");
  if (!symbol) {
    return new Response(JSON.stringify({ error: "Missing symbol parameter" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const quote = await fetchQuote(specFor(symbol));
  if (!quote) {
    return new Response(JSON.stringify({ error: "Failed to fetch quote" }), {
      status: 502,
      headers: { "Content-Type": "application/json" },
    });
  }

  const result = {
    symbol,
    price: quote.price,
    change: quote.change,
    changePercent: quote.changePercent,
    name: quote.name ?? symbol,
  };

  return new Response(JSON.stringify(result), {
    headers: { "Content-Type": "application/json", "Cache-Control": "public, max-age=30" },
  });
};
