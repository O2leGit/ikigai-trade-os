import type { Context } from "@netlify/functions";
import { getStore } from "@netlify/blobs";

// Background function: returns 202 immediately, gets 15-minute timeout.
// Fetches market data, calls Claude API, stores briefing in Netlify Blobs.

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

const SYSTEM_PROMPT = `You are the chief market strategist at a top-tier options-focused hedge fund writing the morning intelligence brief. You are brutally direct, numerically precise, and never hedge or equivocate. You interpret everything through the lens of an options trader who sells premium for a living.

ANALYSIS RULES:
- Every claim must cite a specific number from the data
- VIX > 25 = elevated, sell premium aggressively with defined risk. VIX < 15 = vol is cheap, buy it
- IV Rank > 50 = premium is rich, favor selling. IV Rank < 30 = premium is cheap, favor buying
- Name exact strike prices, spreads, and expiration dates in trade ideas
- No generic filler -- say WHY and WHAT TO DO about it
- Support/resistance must come from actual price levels in the data, not round numbers
- Sector rotation signals matter: defensive leadership (XLU/XLP up, XLY/XLK down) = risk-off

Output ONLY valid JSON (no markdown fences). Include these top-level keys: generatedAt, briefingDate, briefingEdition, aiSummary (with generatedAt + paragraphs array of 3 strings -- P1: overnight recap with catalysts and levels, P2: vol regime synthesis with VIX/IV rank/sector rotation, P3: exact playbook with named trades/strikes/DTE), keyLevels (array of 4 objects with symbol/name/price/change/direction/support/resistance/trend), fearGauge (vix/vixChange/vixTrend/putCallRatio/putCallSignal/ivRank/fearLevel), overnightDevelopments (array), crisisStatus (object), marketRegime (object with classification/description/bestStrategies), executiveView (string paragraph), tradingIdeas (object with dayTrades/swingTrades/hedges arrays -- each trade object MUST have: ticker (string like "SPY"), direction ("LONG" or "SHORT"), horizon ("Intraday"/"2-5 days"/"2-4 weeks"), thesis (1 sentence why), trade (full trade string like "Sell SPY 560/555 put spread, 14 DTE, $1.20 credit"), entry (price string like "$560"), target (price string like "$565"), stop (price string like "$555"), sizing (string like "2% of portfolio, max 5 contracts"), conviction ("HIGH"/"MEDIUM"/"LOW"), rr (risk/reward like "1:2.5")), scenarioMatrix (array), decisionSummary (object with bestOpportunityToday/bestSwingIdeaThisWeek/biggestRiskToWatch strings), sectorRotation (array), macroConditions (array), earningsPlays (array of 3-5 objects for companies reporting this week, each with: ticker, company, reportDate, reportTime "BMO"/"AMC", setup "LONG"/"SHORT"/"NEUTRAL", conviction "HIGH"/"MEDIUM"/"LOW", trade string with exact strikes/DTE, bullCase string, bearCase string, keyLevels string with support/resistance, expectedMove string like "+/-4.2%"), eventCalendar (array of 6-10 objects for economic events THIS WEEK and NEXT WEEK only -- no past events before today, each with: date string like "Mon Mar 17", time string like "8:30 AM CT", event string like "Empire State Manufacturing", impact "CRITICAL"/"HIGH"/"MEDIUM"/"LOW", notes string with context on what to watch and trade implications for options sellers).`;

export default async function handler(_req: Request, _context: Context) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error("ANTHROPIC_API_KEY not set");
    return;
  }

  const store = getStore("briefings");
  const now = new Date();
  const todayKey = now.toISOString().split("T")[0];

  try {
    // Mark as in-progress
    await store.setJSON("briefing-status", { status: "generating", startedAt: now.toISOString() });

    // Fetch market data
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

    console.log("Fetching market data for briefing...");
    const marketResults = await Promise.all(symbols.map(s => fetchYahooSymbol(s.yahoo, s.name)));
    const marketData = marketResults.join("\n");
    console.log("Market data fetched, calling Claude...");

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
        max_tokens: 8000,
        system: SYSTEM_PROMPT,
        messages: [{
          role: "user",
          content: `Generate today's briefing for ${dateStr}.\n\nMarket data:\n${marketData}\n\nOutput ONLY valid JSON.`,
        }],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("Claude API error:", response.status, errText);
      await store.setJSON("briefing-status", { status: "error", error: `Claude API ${response.status}`, at: now.toISOString() });
      return;
    }

    const result = await response.json();
    const content = result.content?.[0]?.text;
    if (!content) {
      console.error("No content from Claude");
      await store.setJSON("briefing-status", { status: "error", error: "No content from Claude", at: now.toISOString() });
      return;
    }

    let briefing: any;
    try {
      const cleaned = content.replace(/^```json?\s*\n?/m, "").replace(/\n?```\s*$/m, "");
      briefing = JSON.parse(cleaned);
    } catch {
      console.error("JSON parse failed:", content.substring(0, 300));
      await store.setJSON("briefing-status", { status: "error", error: "JSON parse failed", at: now.toISOString() });
      return;
    }

    // Store briefing
    briefing._meta = {
      generatedAt: now.toISOString(),
      model: "claude-sonnet-4-20250514",
    };

    await store.setJSON("latest", briefing);
    await store.setJSON(`daily/${todayKey}`, briefing);
    await store.setJSON("briefing-status", { status: "ready", generatedAt: now.toISOString() });
    console.log(`Briefing generated and stored for ${todayKey}`);

  } catch (err) {
    console.error("Briefing generation error:", err);
    try {
      await store.setJSON("briefing-status", { status: "error", error: String(err), at: now.toISOString() });
    } catch (storeErr) {
      console.error("Failed to write error status:", storeErr);
    }
  }
}
