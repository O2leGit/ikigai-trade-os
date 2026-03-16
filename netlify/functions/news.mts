import type { Context } from "@netlify/functions";

// ═══════════════════════════════════════════════════════════════════════════════
// NEWS AGGREGATOR -- Finnhub + MarketAux with trade play suggestions
// ═══════════════════════════════════════════════════════════════════════════════

const BEARISH_KEYWORDS = [
  "drop", "fall", "crash", "recession", "bearish", "decline", "loss",
  "sell", "fear", "risk", "warning", "downgrade", "cut", "layoff",
  "tariff", "inflation", "slump", "plunge", "tumble", "selloff",
  "default", "bankruptcy", "shutdown", "deficit",
];

const BULLISH_KEYWORDS = [
  "rally", "surge", "gain", "bullish", "rise", "growth", "upgrade",
  "beat", "record", "breakout", "boost", "optimism", "soar", "jump",
  "recovery", "expansion", "dividend", "buyback", "acquisition",
];

const HIGH_IMPACT_KEYWORDS = [
  "fed", "fomc", "inflation", "gdp", "cpi", "pce", "jobs",
  "unemployment", "war", "crisis", "rate decision", "powell",
  "emergency", "pandemic", "default", "shutdown",
];

const MEDIUM_IMPACT_KEYWORDS = [
  "earnings", "revenue", "aapl", "msft", "googl", "amzn", "tsla",
  "nvda", "meta", "nflx", "spy", "qqq", "oil", "treasury",
  "sector", "rotation", "upgrade", "downgrade",
];

// ── Event-to-trade mapping (institutional desk playbook) ──
const TRADE_PLAYS: Record<string, { play: string; strategy: string; timeframe: string }> = {
  fed: { play: "Sell SPX iron condor 30 DTE if VIX > 20, buy VIX calls if VIX < 18", strategy: "Volatility", timeframe: "1-2 weeks" },
  fomc: { play: "Sell straddles on SPY pre-announcement, buy back after IV crush", strategy: "IV Crush", timeframe: "0-3 DTE" },
  inflation: { play: "Buy TLT puts if CPI hot, sell put spreads on XLF if rates rising", strategy: "Macro", timeframe: "1-4 weeks" },
  cpi: { play: "Sell SPY straddle day before, close after number. If surprise: buy directional 0DTE", strategy: "Event", timeframe: "0-1 DTE" },
  earnings: { play: "Sell iron condor or strangle pre-earnings for IV crush. Width = expected move x 1.2", strategy: "Earnings", timeframe: "0-5 DTE" },
  rally: { play: "Sell call credit spreads above resistance. Buy put spreads for protection", strategy: "Mean Reversion", timeframe: "1-2 weeks" },
  crash: { play: "Buy SPX put spreads, sell VIX put spreads on the spike", strategy: "Hedging", timeframe: "0-5 DTE" },
  selloff: { play: "Sell put spreads at support levels for premium. Wait for VIX > 25", strategy: "Premium Selling", timeframe: "2-4 weeks" },
  tariff: { play: "Buy puts on exposed sectors (XLI, EEM). Sell premium on VIX spike", strategy: "Geopolitical", timeframe: "1-4 weeks" },
  oil: { play: "Sell iron condors on USO/XLE. Trade directional on breakout above/below range", strategy: "Commodity", timeframe: "2-4 weeks" },
  upgrade: { play: "Buy call spreads on upgraded ticker, 30-45 DTE. Target: analyst price target", strategy: "Momentum", timeframe: "2-6 weeks" },
  downgrade: { play: "Buy put spreads if breaking support. Sell put credit spreads at strong support", strategy: "Momentum", timeframe: "1-4 weeks" },
  acquisition: { play: "Sell puts on acquirer (dip-buy). Sell calls on target above deal price (merger arb)", strategy: "M&A", timeframe: "1-8 weeks" },
  buyback: { play: "Sell put spreads below current price -- company buying is floor support", strategy: "Premium Selling", timeframe: "4-8 weeks" },
  dividend: { play: "Sell covered calls above ex-div price. Calendar spreads across ex-div date", strategy: "Income", timeframe: "2-4 weeks" },
  war: { play: "Buy SPX put spreads, buy gold calls (GLD). Sell premium after VIX spike > 30", strategy: "Crisis", timeframe: "0-2 weeks" },
  recession: { play: "Buy put spreads on cyclicals (XLY, XLI). Sell put spreads on defensives (XLU, XLP)", strategy: "Rotation", timeframe: "4-12 weeks" },
};

function analyzeSentiment(headline: string, summary: string, marketauxScore?: number): "bullish" | "bearish" | "neutral" {
  // If MarketAux provides a numeric sentiment score, use it
  if (marketauxScore !== undefined) {
    if (marketauxScore > 0.15) return "bullish";
    if (marketauxScore < -0.15) return "bearish";
    return "neutral";
  }

  const text = `${headline} ${summary}`.toLowerCase();
  let bullish = 0;
  let bearish = 0;

  for (const kw of BEARISH_KEYWORDS) {
    if (text.includes(kw)) bearish++;
  }
  for (const kw of BULLISH_KEYWORDS) {
    if (text.includes(kw)) bullish++;
  }

  if (bearish > bullish) return "bearish";
  if (bullish > bearish) return "bullish";
  return "neutral";
}

function analyzeImpact(headline: string): "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" {
  const lower = headline.toLowerCase();

  // CRITICAL: multiple high-impact keywords or specific phrases
  const highHits = HIGH_IMPACT_KEYWORDS.filter(kw => lower.includes(kw));
  if (highHits.length >= 2) return "CRITICAL";

  for (const kw of HIGH_IMPACT_KEYWORDS) {
    if (lower.includes(kw)) return "HIGH";
  }
  for (const kw of MEDIUM_IMPACT_KEYWORDS) {
    if (lower.includes(kw)) return "MEDIUM";
  }
  return "LOW";
}

function suggestTradePlay(headline: string, summary: string): { play: string; strategy: string; timeframe: string } | null {
  const text = `${headline} ${summary}`.toLowerCase();

  // Check each trade play keyword
  for (const [keyword, tradePlay] of Object.entries(TRADE_PLAYS)) {
    if (text.includes(keyword)) {
      return tradePlay;
    }
  }
  return null;
}

function extractTickers(headline: string, summary: string, entities?: any[]): string[] {
  const tickers: string[] = [];

  // From MarketAux entities
  if (entities && Array.isArray(entities)) {
    for (const e of entities) {
      if (e.symbol) tickers.push(e.symbol);
    }
  }

  // Extract from text -- common tickers in parentheses or standalone
  const text = `${headline} ${summary}`;
  const tickerRegex = /\b([A-Z]{1,5})\b/g;
  const knownTickers = new Set([
    "SPY", "QQQ", "IWM", "DIA", "AAPL", "MSFT", "GOOGL", "AMZN", "TSLA",
    "NVDA", "META", "NFLX", "AMD", "INTC", "BA", "JPM", "GS", "BAC",
    "XLE", "XLF", "XLK", "XLV", "XLU", "XLY", "XLP", "XLI", "GLD",
    "TLT", "VIX", "SPX", "USO", "EEM", "COIN", "PLTR", "SOFI",
  ]);

  let match;
  while ((match = tickerRegex.exec(text)) !== null) {
    if (knownTickers.has(match[1]) && !tickers.includes(match[1])) {
      tickers.push(match[1]);
    }
  }

  return tickers.slice(0, 5); // Max 5 tickers per article
}

// ── Finnhub types ──
interface FinnhubNewsItem {
  headline: string;
  source: string;
  summary: string;
  url: string;
  datetime: number;
}

// ── MarketAux types ──
interface MarketAuxEntity {
  symbol: string;
  name: string;
  sentiment_score: number;
}

interface MarketAuxItem {
  title: string;
  description: string;
  url: string;
  source: string;
  published_at: string;
  entities: MarketAuxEntity[];
  relevance_score?: number;
}

// ── Unified output ──
interface NewsOutput {
  headline: string;
  source: string;
  sentiment: "bullish" | "bearish" | "neutral";
  sentimentScore?: number;
  impact: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  detail: string;
  url: string;
  datetime: number;
  tickers: string[];
  tradePlay: { play: string; strategy: string; timeframe: string } | null;
  provider: "finnhub" | "marketaux";
}

export default async function handler(req: Request, _context: Context) {
  const url = new URL(req.url);
  const finnhubKey = url.searchParams.get("key");
  const marketauxKey = process.env.MARKETAUX_KEY;

  const results: NewsOutput[] = [];
  const seenHeadlines = new Set<string>();
  const errors: string[] = [];

  // ── Fetch Finnhub ──
  if (finnhubKey) {
    try {
      const endpoint = `https://finnhub.io/api/v1/news?category=general&minId=0&token=${finnhubKey}`;
      const res = await fetch(endpoint);

      if (res.ok) {
        const items: FinnhubNewsItem[] = await res.json();
        for (const item of items.slice(0, 15)) {
          const key = item.headline.toLowerCase().slice(0, 60);
          if (seenHeadlines.has(key)) continue;
          seenHeadlines.add(key);

          results.push({
            headline: item.headline,
            source: item.source,
            sentiment: analyzeSentiment(item.headline, item.summary),
            impact: analyzeImpact(item.headline),
            detail: item.summary?.length > 300 ? item.summary.slice(0, 300) + "..." : (item.summary || ""),
            url: item.url,
            datetime: item.datetime,
            tickers: extractTickers(item.headline, item.summary),
            tradePlay: suggestTradePlay(item.headline, item.summary),
            provider: "finnhub",
          });
        }
      } else {
        errors.push(`Finnhub: ${res.status}`);
      }
    } catch (err) {
      errors.push(`Finnhub: ${err instanceof Error ? err.message : "failed"}`);
    }
  }

  // ── Fetch MarketAux ──
  if (marketauxKey) {
    try {
      const symbols = "SPY,QQQ,AAPL,NVDA,TSLA,MSFT,AMZN,META,AMD,BA";
      const endpoint = `https://api.marketaux.com/v1/news/all?symbols=${symbols}&filter_entities=true&language=en&api_token=${marketauxKey}`;
      const res = await fetch(endpoint);

      if (res.ok) {
        const json = await res.json();
        const items: MarketAuxItem[] = json.data || [];

        for (const item of items.slice(0, 10)) {
          const key = item.title.toLowerCase().slice(0, 60);
          if (seenHeadlines.has(key)) continue;
          seenHeadlines.add(key);

          // Average entity sentiment scores
          const avgSentiment = item.entities?.length > 0
            ? item.entities.reduce((sum, e) => sum + (e.sentiment_score || 0), 0) / item.entities.length
            : undefined;

          results.push({
            headline: item.title,
            source: item.source || "MarketAux",
            sentiment: analyzeSentiment(item.title, item.description || "", avgSentiment),
            sentimentScore: avgSentiment,
            impact: analyzeImpact(item.title),
            detail: (item.description || "").length > 300 ? (item.description || "").slice(0, 300) + "..." : (item.description || ""),
            url: item.url,
            datetime: Math.floor(new Date(item.published_at).getTime() / 1000),
            tickers: extractTickers(item.title, item.description || "", item.entities),
            tradePlay: suggestTradePlay(item.title, item.description || ""),
            provider: "marketaux",
          });
        }
      } else {
        errors.push(`MarketAux: ${res.status}`);
      }
    } catch (err) {
      errors.push(`MarketAux: ${err instanceof Error ? err.message : "failed"}`);
    }
  }

  // No sources available
  if (!finnhubKey && !marketauxKey) {
    return new Response(
      JSON.stringify({ error: "No news API keys configured. Add Finnhub key on Connections page or set MARKETAUX_KEY env var." }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  // Sort by recency, HIGH/CRITICAL impact first within same hour
  results.sort((a, b) => {
    const impactOrder = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
    const hourA = Math.floor(a.datetime / 3600);
    const hourB = Math.floor(b.datetime / 3600);
    if (hourA === hourB) return (impactOrder[a.impact] || 3) - (impactOrder[b.impact] || 3);
    return b.datetime - a.datetime;
  });

  const response = {
    items: results.slice(0, 20),
    fetchedAt: new Date().toISOString(),
    sources: [
      ...(finnhubKey ? ["Finnhub"] : []),
      ...(marketauxKey ? ["MarketAux"] : []),
    ],
    errors: errors.length > 0 ? errors : undefined,
  };

  return new Response(JSON.stringify(response), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "public, max-age=180", // 3-min cache
    },
  });
}
