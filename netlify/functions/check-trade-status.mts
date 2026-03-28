import type { Context } from "@netlify/functions";

interface TradeInput {
  ticker: string;
  direction: string;
  entry?: string;
  target?: string;
  stop?: string;
  status?: string;
}

interface TradeStatusResult {
  ticker: string;
  livePrice: number | null;
  change: number;
  changePercent: number;
  computedStatus: string;
  hitTarget: boolean;
  hitStop: boolean;
  distanceToTarget: string | null;
  distanceToStop: string | null;
  priceVsEntry: string | null;
  fetchedAt: string;
}

// Parse price string like "$114.00–$115.50" → returns midpoint or single value
function parsePrice(s: string | undefined): number | null {
  if (!s) return null;
  // Remove dollar signs, spaces
  const cleaned = s.replace(/[$\s]/g, "");
  // Try range: "114.00–115.50" or "114.00-115.50"
  const range = cleaned.match(/([\d.]+)[–\-—]+([\d.]+)/);
  if (range) {
    const low = parseFloat(range[1]);
    const high = parseFloat(range[2]);
    if (!isNaN(low) && !isNaN(high)) return (low + high) / 2;
  }
  // Try single number
  const single = cleaned.match(/([\d.]+)/);
  if (single) {
    const val = parseFloat(single[1]);
    if (!isNaN(val)) return val;
  }
  return null;
}

async function fetchYahooQuote(symbol: string) {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1m&range=1d`;
  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
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
  return { price, change, changePercent };
}

function computeStatus(
  trade: TradeInput,
  livePrice: number
): { computedStatus: string; hitTarget: boolean; hitStop: boolean } {
  const entry = parsePrice(trade.entry);
  const target = parsePrice(trade.target);
  const stop = parsePrice(trade.stop);
  const isLong = !trade.direction?.toUpperCase().includes("SHORT");

  // If the original status is already terminal, keep it
  const originalStatus = (trade.status || "").toUpperCase();
  if (["CLOSED", "EXPIRED"].includes(originalStatus)) {
    return { computedStatus: originalStatus, hitTarget: false, hitStop: false };
  }

  if (isLong) {
    if (target && livePrice >= target) {
      return { computedStatus: "TARGET HIT", hitTarget: true, hitStop: false };
    }
    if (stop && livePrice <= stop) {
      return { computedStatus: "STOPPED", hitTarget: false, hitStop: true };
    }
  } else {
    // Short: target is below entry, stop is above entry
    if (target && livePrice <= target) {
      return { computedStatus: "TARGET HIT", hitTarget: true, hitStop: false };
    }
    if (stop && livePrice >= stop) {
      return { computedStatus: "STOPPED", hitTarget: false, hitStop: true };
    }
  }

  // Check if filled (price is within entry range)
  if (entry) {
    const entryRange = trade.entry?.replace(/[$\s]/g, "").match(/([\d.]+)[–\-—]+([\d.]+)/);
    if (entryRange) {
      const low = parseFloat(entryRange[1]);
      const high = parseFloat(entryRange[2]);
      if (isLong && livePrice >= low && livePrice <= high) {
        return { computedStatus: "AT ENTRY", hitTarget: false, hitStop: false };
      }
      if (!isLong && livePrice >= low && livePrice <= high) {
        return { computedStatus: "AT ENTRY", hitTarget: false, hitStop: false };
      }
    }
  }

  return { computedStatus: originalStatus || "OPEN", hitTarget: false, hitStop: false };
}

function formatPercent(from: number, to: number): string {
  const pct = ((to - from) / from) * 100;
  const sign = pct >= 0 ? "+" : "";
  return `${sign}${pct.toFixed(1)}%`;
}

export default async (req: Request, _context: Context) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "POST required" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  let trades: TradeInput[];
  try {
    const body = await req.json();
    trades = body.trades;
    if (!Array.isArray(trades)) throw new Error("trades must be an array");
  } catch {
    return new Response(JSON.stringify({ error: "Invalid request body" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Deduplicate tickers for efficient fetching
  const uniqueTickers = [...new Set(trades.map((t) => t.ticker.toUpperCase()))];
  const quoteMap = new Map<string, { price: number; change: number; changePercent: number }>();

  const quoteResults = await Promise.allSettled(
    uniqueTickers.map(async (ticker) => {
      const quote = await fetchYahooQuote(ticker);
      if (quote) quoteMap.set(ticker, quote);
    })
  );

  const results: TradeStatusResult[] = trades.map((trade) => {
    const ticker = trade.ticker.toUpperCase();
    const quote = quoteMap.get(ticker);
    const livePrice = quote?.price ?? null;
    const entry = parsePrice(trade.entry);
    const target = parsePrice(trade.target);
    const stop = parsePrice(trade.stop);

    if (!livePrice) {
      return {
        ticker,
        livePrice: null,
        change: 0,
        changePercent: 0,
        computedStatus: trade.status || "OPEN",
        hitTarget: false,
        hitStop: false,
        distanceToTarget: null,
        distanceToStop: null,
        priceVsEntry: null,
        fetchedAt: new Date().toISOString(),
      };
    }

    const { computedStatus, hitTarget, hitStop } = computeStatus(trade, livePrice);

    return {
      ticker,
      livePrice,
      change: quote!.change,
      changePercent: quote!.changePercent,
      computedStatus,
      hitTarget,
      hitStop,
      distanceToTarget: target ? formatPercent(livePrice, target) : null,
      distanceToStop: stop ? formatPercent(livePrice, stop) : null,
      priceVsEntry: entry ? formatPercent(entry, livePrice) : null,
      fetchedAt: new Date().toISOString(),
    };
  });

  return new Response(JSON.stringify({ results, fetchedAt: new Date().toISOString() }), {
    headers: { "Content-Type": "application/json", "Cache-Control": "public, max-age=30" },
  });
};
