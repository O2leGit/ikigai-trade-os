import type { Context } from "@netlify/functions";
import { getStore } from "@netlify/blobs";

const YAHOO_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
};

async function fetchYahooSymbol(yahooSym: string, name: string): Promise<string> {
  try {
    const res = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${yahooSym}?range=5d&interval=1d`,
      { headers: YAHOO_HEADERS }
    );
    if (!res.ok) return `${name}: HTTP ${res.status}`;
    const data = await res.json();
    const quotes = data.chart?.result?.[0]?.indicators?.quote?.[0];
    const meta = data.chart?.result?.[0]?.meta;
    if (!quotes || !meta) return `${name}: No data`;
    const closes = (quotes.close || []).filter((c: number | null) => c !== null);
    const lastClose = closes[closes.length - 1];
    const prevClose = closes.length > 1 ? closes[closes.length - 2] : meta.chartPreviousClose;
    const change = prevClose ? ((lastClose - prevClose) / prevClose * 100).toFixed(2) : "N/A";
    return `${name}: $${lastClose?.toFixed(2)} (${change}%)`;
  } catch (err) {
    return `${name}: ${err instanceof Error ? err.message : "unavailable"}`;
  }
}

const SYSTEM_PROMPT = `You are an expert market analyst for IkigaiTradeOS. Generate a daily pre-market briefing in JSON format. Output ONLY valid JSON (no markdown fences). Include these top-level keys: generatedAt, briefingDate, briefingEdition, aiSummary (with generatedAt + paragraphs array of 3 strings), keyLevels (array of 4 objects with symbol/name/price/change/direction/support/resistance/trend), fearGauge (vix/vixChange/vixTrend/putCallRatio/putCallSignal/ivRank/fearLevel), overnightDevelopments (array), crisisStatus (object), marketRegime (object with classification/description/bestStrategies), executiveView (string paragraph), tradingIdeas (object with dayTrades/swingTrades/hedges arrays), scenarioMatrix (array), decisionSummary (object with bestOpportunityToday/bestSwingIdeaThisWeek/biggestRiskToWatch strings), sectorRotation (array), macroConditions (array). Be specific with real numbers and tickers.`;

export default async function handler(req: Request, _context: Context) {
  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
  };

  // Step 1: Check API key
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ error: "ANTHROPIC_API_KEY not set" }), { status: 500, headers });
  }

  try {
    // Step 2: Fetch market data
    const symbols = [
      { yahoo: "%5EGSPC", name: "S&P 500" },
      { yahoo: "%5EVIX", name: "VIX" },
      { yahoo: "SPY", name: "SPY" },
      { yahoo: "QQQ", name: "QQQ" },
      { yahoo: "IWM", name: "IWM" },
      { yahoo: "DIA", name: "DIA" },
      { yahoo: "XLE", name: "XLE" },
      { yahoo: "XLK", name: "XLK" },
      { yahoo: "GLD", name: "GLD" },
    ];

    const marketResults = await Promise.all(
      symbols.map((s) => fetchYahooSymbol(s.yahoo, s.name))
    );
    const marketData = marketResults.join("\n");

    // Step 3: Call Claude
    const now = new Date();
    const dateStr = now.toLocaleDateString("en-US", {
      weekday: "long", year: "numeric", month: "long", day: "numeric",
      timeZone: "America/Chicago",
    });

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 6000,
        system: SYSTEM_PROMPT,
        messages: [{
          role: "user",
          content: `Generate today's briefing for ${dateStr}.\n\nMarket data:\n${marketData}\n\nOutput ONLY valid JSON.`,
        }],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      return new Response(JSON.stringify({ error: "Claude API error", status: response.status, detail: errText }), { status: 502, headers });
    }

    const result = await response.json();
    const content = result.content?.[0]?.text;
    if (!content) {
      return new Response(JSON.stringify({ error: "No content from Claude" }), { status: 502, headers });
    }

    // Step 4: Parse JSON
    let briefing;
    try {
      const cleaned = content.replace(/^```json?\s*\n?/m, "").replace(/\n?```\s*$/m, "");
      briefing = JSON.parse(cleaned);
    } catch (parseErr) {
      return new Response(JSON.stringify({
        error: "JSON parse failed",
        raw: content.substring(0, 500),
      }), { status: 502, headers });
    }

    // Step 5: Store in Blobs
    briefing._meta = {
      generatedAt: now.toISOString(),
      model: "claude-sonnet-4-20250514",
    };

    const store = getStore("briefings");
    const todayKey = now.toISOString().split("T")[0];
    await store.setJSON("latest", briefing);
    await store.setJSON(`daily/${todayKey}`, briefing);

    return new Response(JSON.stringify({
      success: true,
      date: todayKey,
      sections: Object.keys(briefing),
      marketData,
    }), { status: 200, headers });

  } catch (err) {
    return new Response(JSON.stringify({
      error: "Runtime error",
      message: String(err),
      stack: err instanceof Error ? err.stack : undefined,
    }), { status: 500, headers });
  }
}
