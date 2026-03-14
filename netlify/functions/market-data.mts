import type { Context } from "@netlify/functions";

const SYMBOLS: { symbol: string; asset: string }[] = [
  { symbol: "^GSPC", asset: "S&P 500 Futures" },
  { symbol: "^IXIC", asset: "Nasdaq Futures" },
  { symbol: "^DJI", asset: "Dow Futures" },
  { symbol: "^VIX", asset: "VIX" },
  { symbol: "CL=F", asset: "WTI Crude" },
  { symbol: "^TNX", asset: "10Y Treasury" },
  { symbol: "GC=F", asset: "Gold" },
  { symbol: "SI=F", asset: "Silver" },
  { symbol: "DX-Y.NYB", asset: "US Dollar (DXY)" },
  { symbol: "BTC-USD", asset: "Bitcoin" },
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
    return { price, change, changePercent };
  } catch {
    return null;
  }
}

export default async (req: Request, context: Context) => {
  const results = await Promise.allSettled(SYMBOLS.map(s => fetchYahooQuote(s.symbol)));
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
