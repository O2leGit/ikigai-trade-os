import type { Context } from "@netlify/functions";

const TICKER_SYMBOLS = ["NVDA", "PLTR", "GDX", "SLV", "USO", "ADBE", "ULTA", "ORCL", "^VIX", "GC=F"];

async function fetchYahooQuote(symbol: string) {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1m&range=1d`;
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept": "application/json",
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
    return { symbol, price, change, changePercent, name: meta.shortName ?? meta.symbol ?? symbol };
  } catch {
    return null;
  }
}

export default async (req: Request, context: Context) => {
  const results = await Promise.allSettled(TICKER_SYMBOLS.map(sym => fetchYahooQuote(sym)));
  const tickers = results
    .map((r, i) => {
      if (r.status === "fulfilled" && r.value) return r.value;
      return { symbol: TICKER_SYMBOLS[i], price: 0, change: 0, changePercent: 0, name: TICKER_SYMBOLS[i] };
    });

  return new Response(JSON.stringify(tickers), {
    headers: { "Content-Type": "application/json", "Cache-Control": "public, max-age=30" },
  });
};
