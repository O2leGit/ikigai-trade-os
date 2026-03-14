import type { Context } from "@netlify/functions";

const BEARISH_KEYWORDS = [
  "drop", "fall", "crash", "recession", "bearish", "decline", "loss",
  "sell", "fear", "risk", "warning", "downgrade", "cut", "layoff",
  "tariff", "inflation",
];

const BULLISH_KEYWORDS = [
  "rally", "surge", "gain", "bullish", "rise", "growth", "upgrade",
  "beat", "record", "breakout", "boost", "optimism",
];

const HIGH_IMPACT_KEYWORDS = [
  "fed", "fomc", "inflation", "gdp", "cpi", "pce", "jobs",
  "unemployment", "war", "crisis",
];

const MEDIUM_IMPACT_KEYWORDS = [
  "earnings", "revenue", "aapl", "msft", "googl", "amzn", "tsla",
  "nvda", "meta", "nflx", "spy", "qqq",
];

function analyzeSentiment(headline: string, summary: string): "bullish" | "bearish" | "neutral" {
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

function analyzeImpact(headline: string): "HIGH" | "MEDIUM" | "LOW" {
  const lower = headline.toLowerCase();

  for (const kw of HIGH_IMPACT_KEYWORDS) {
    if (lower.includes(kw)) return "HIGH";
  }
  for (const kw of MEDIUM_IMPACT_KEYWORDS) {
    if (lower.includes(kw)) return "MEDIUM";
  }
  return "LOW";
}

interface FinnhubNewsItem {
  headline: string;
  source: string;
  summary: string;
  url: string;
  datetime: number;
}

export default async function handler(req: Request, _context: Context) {
  const url = new URL(req.url);
  const key = url.searchParams.get("key");

  if (!key) {
    return new Response(
      JSON.stringify({ error: "Finnhub API key required. Configure in Connections page." }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  try {
    const endpoint = `https://finnhub.io/api/v1/news?category=general&minId=0&token=${key}`;
    const res = await fetch(endpoint);

    if (!res.ok) {
      return new Response(
        JSON.stringify({ error: `Finnhub API error: ${res.status} ${res.statusText}` }),
        { status: res.status, headers: { "Content-Type": "application/json" } },
      );
    }

    const items: FinnhubNewsItem[] = await res.json();

    const transformed = items.slice(0, 10).map((item) => ({
      headline: item.headline,
      source: item.source,
      sentiment: analyzeSentiment(item.headline, item.summary),
      impact: analyzeImpact(item.headline),
      detail: item.summary?.length > 300 ? item.summary.slice(0, 300) + "..." : (item.summary || ""),
      url: item.url,
      datetime: item.datetime,
    }));

    return new Response(JSON.stringify(transformed), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "public, max-age=300",
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: `Failed to fetch news: ${message}` }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
}
