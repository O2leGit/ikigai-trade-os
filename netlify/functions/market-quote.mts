import type { Context } from "@netlify/functions";

async function fetchYahooQuote(symbol: string) {
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
}

export default async (req: Request, context: Context) => {
  const url = new URL(req.url);
  const symbol = url.searchParams.get("symbol");
  if (!symbol) {
    return new Response(JSON.stringify({ error: "Missing symbol parameter" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const result = await fetchYahooQuote(symbol);
  if (!result) {
    return new Response(JSON.stringify({ error: "Failed to fetch quote" }), {
      status: 502,
      headers: { "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify(result), {
    headers: { "Content-Type": "application/json", "Cache-Control": "public, max-age=30" },
  });
};
