import type { Context } from "@netlify/functions";

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

function formatYtd(changePercent: number): string {
  const sign = changePercent >= 0 ? "+" : "";
  return `${sign}${changePercent.toFixed(1)}%`;
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
  const results = await Promise.allSettled(SECTOR_ETFS.map(s => fetchYahooQuote(s.ticker)));
  const sectors = results.map((r, i) => {
    const { ticker, sector } = SECTOR_ETFS[i];
    if (r.status === "fulfilled" && r.value) {
      const { price, changePercent } = r.value;
      return {
        sector,
        ticker,
        price,
        changePercent: parseFloat(changePercent.toFixed(2)),
        ytd: formatYtd(changePercent),
        status: getStatus(changePercent),
      };
    }
    return { sector, ticker, price: 0, changePercent: 0, ytd: "+0.0%", status: "NEUTRAL" as const };
  });

  return new Response(JSON.stringify(sectors), {
    headers: { "Content-Type": "application/json", "Cache-Control": "public, max-age=60" },
  });
};
