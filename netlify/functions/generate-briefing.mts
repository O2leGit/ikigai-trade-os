import type { Config, Context } from "@netlify/functions";
import { getStore } from "@netlify/blobs";

const SYSTEM_PROMPT = `You are the chief market strategist at a top-tier options-focused hedge fund writing the morning intelligence brief. Portfolio managers trade off your analysis. You are brutally direct, numerically precise, and never hedge or equivocate. You interpret everything through the lens of an options trader who sells premium for a living.

ANALYSIS RULES:
- Every claim must cite a specific number from the data
- VIX > 25 = elevated, sell premium aggressively with defined risk. VIX < 15 = vol is cheap, buy it
- IV Rank > 50 = premium is rich, favor selling. IV Rank < 30 = premium is cheap, favor buying
- Name exact strike prices, spreads, and expiration dates in trade ideas
- No generic filler like "markets are volatile" -- say WHY and WHAT TO DO about it
- Support/resistance must come from actual price levels in the data, not round numbers
- Sector rotation signals matter: defensive leadership (XLU/XLP up, XLY/XLK down) = risk-off

Your output must be valid JSON matching this exact structure (no markdown, no code fences, just raw JSON):

{
  "generatedAt": "ISO 8601 timestamp",
  "briefingDate": "Day of week, Month DD, YYYY",
  "briefingEdition": "Vol. I -- Issue NNN",
  "aiSummary": {
    "generatedAt": "ISO 8601 timestamp",
    "paragraphs": [
      "PARAGRAPH 1 - OVERNIGHT & MARKET PULSE: What happened overnight and pre-market. Lead with the single most important signal. Include specific index levels, futures moves, and any gap up/down. Name the catalyst. 3-4 dense sentences.",
      "PARAGRAPH 2 - VOL REGIME & STRUCTURE: Interpret VIX level + direction + IV rank together. Is vol overpriced or cheap? What does the put/call ratio tell us about positioning? Cross-reference with sector rotation -- are institutions rotating defensive? What does this mean for premium sellers vs buyers? 3-4 sentences with numbers.",
      "PARAGRAPH 3 - TODAY'S PLAYBOOK: Specific action plan. Name 2-3 exact trades with ticker, strategy, strikes, and DTE. State the regime-appropriate position size. Identify the key level that invalidates the thesis. End with one bold conviction call. 3-4 sentences."
    ]
  },
  "keyLevels": [
    { "symbol": "SPY", "name": "S&P 500 ETF", "price": "XXX.XX", "change": "+/-X.X%", "direction": "up|down", "support": "XXX.XX", "resistance": "XXX.XX", "trend": "Bullish|Bearish|Neutral" },
    { "symbol": "QQQ", "name": "Nasdaq 100 ETF", "price": "XXX.XX", "change": "+/-X.X%", "direction": "up|down", "support": "XXX.XX", "resistance": "XXX.XX", "trend": "..." },
    { "symbol": "IWM", "name": "Russell 2000 ETF", "price": "XXX.XX", "change": "+/-X.X%", "direction": "up|down", "support": "XXX.XX", "resistance": "XXX.XX", "trend": "..." },
    { "symbol": "DIA", "name": "Dow Jones ETF", "price": "XXX.XX", "change": "+/-X.X%", "direction": "up|down", "support": "XXX.XX", "resistance": "XXX.XX", "trend": "..." }
  ],
  "fearGauge": {
    "vix": "XX.XX", "vixChange": "+/-X.X%", "vixTrend": "up|down",
    "putCallRatio": "X.XX", "putCallSignal": "Extreme Fear|Elevated Fear|Neutral|Complacent",
    "ivRank": 0-100, "fearLevel": "CRISIS|ELEVATED|NORMAL|LOW"
  },
  "overnightDevelopments": [
    { "time": "HH:MM AM/PM CT", "event": "Headline", "details": "2-3 sentences", "impact": "CRITICAL|HIGH|MEDIUM|LOW", "affectedAssets": ["tickers"], "direction": "bullish|bearish|neutral" }
  ],
  "crisisStatus": {
    "threatLevel": "CRITICAL|HIGH|ELEVATED|LOW|NONE",
    "title": "Crisis name or 'No Active Crisis'",
    "summary": "2-3 sentences",
    "startDate": "Month DD, YYYY",
    "dayCount": N,
    "indicators": [{ "label": "Indicator name", "value": "Value", "status": "critical|warning|neutral" }],
    "affectedSectors": [{ "sector": "Name", "impact": "Description", "direction": "up|down" }]
  },
  "marketRegime": {
    "regime": "CRISIS|ELEVATED|NORMAL|LOW_VOL",
    "label": "Human readable label",
    "description": "1-2 sentences",
    "color": "red|orange|blue|green"
  },
  "executiveView": {
    "marketPosture": "DEFENSIVE|CAUTIOUS|NEUTRAL|OPPORTUNISTIC|AGGRESSIVE",
    "todayPlaybook": "2-3 sentences on today's strategy",
    "keyThemes": ["3-5 key themes driving the market"],
    "riskLevel": "CRITICAL|HIGH|MEDIUM|LOW"
  },
  "tradingIdeas": {
    "dayTrades": [{ "ticker": "SYM", "strategy": "Strategy name", "entry": "Price/level", "target": "Price/level", "stop": "Price/level", "conviction": "HIGH|MEDIUM|LOW", "rationale": "Why" }],
    "swingTrades": [same structure],
    "hedges": [same structure]
  },
  "scenarioMatrix": [
    { "scenario": "Name", "description": "2-3 sentences", "probability": 0-100, "spxRange": "X,XXX - X,XXX", "triggers": ["3 triggers"], "bestTrades": ["3 trade ideas"] }
  ],
  "decisionSummary": {
    "verdict": "DEFENSIVE|CAUTIOUS|NEUTRAL|OPPORTUNISTIC|AGGRESSIVE",
    "oneLiner": "One sentence summary",
    "cards": [{ "label": "Category", "value": "Value", "detail": "Explanation" }]
  },
  "sectorRotation": [
    { "sector": "Name", "etf": "SYM", "weeklyReturn": "+/-X.X%", "signal": "OVERWEIGHT|NEUTRAL|UNDERWEIGHT", "notes": "Brief note" }
  ],
  "macroConditions": [
    { "indicator": "Name", "value": "Current value", "prior": "Prior value", "signal": "BULLISH|BEARISH|NEUTRAL", "notes": "Brief" }
  ]
}

Be specific with numbers, levels, and tickers. Use real market analysis — no generic filler. Write for an experienced options trader who needs actionable intelligence.`;

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

async function fetchMarketData(): Promise<string> {
  const symbols = [
    { yahoo: "%5EGSPC", name: "S&P 500" },
    { yahoo: "%5EVIX", name: "VIX" },
    { yahoo: "%5EDJI", name: "Dow Jones" },
    { yahoo: "%5EIXIC", name: "Nasdaq" },
    { yahoo: "CL%3DF", name: "Crude Oil" },
    { yahoo: "%5ETNX", name: "10Y Treasury" },
    { yahoo: "SPY", name: "SPY ETF" },
    { yahoo: "QQQ", name: "QQQ ETF" },
    { yahoo: "IWM", name: "IWM ETF" },
    { yahoo: "DIA", name: "DIA ETF" },
    { yahoo: "GLD", name: "Gold ETF" },
    { yahoo: "XLE", name: "XLE" },
    { yahoo: "XLK", name: "XLK" },
    { yahoo: "XLF", name: "XLF" },
    { yahoo: "XLV", name: "XLV" },
    { yahoo: "XLU", name: "XLU" },
    { yahoo: "XLY", name: "XLY" },
    { yahoo: "XLP", name: "XLP" },
    { yahoo: "XLI", name: "XLI" },
    { yahoo: "XLB", name: "XLB" },
    { yahoo: "XLRE", name: "XLRE" },
  ];

  // Fetch all in parallel
  const results = await Promise.all(
    symbols.map((s) => fetchYahooSymbol(s.yahoo, s.name))
  );

  return results.join("\n");
}

export default async function handler(_req: Request, _context: Context) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error("ANTHROPIC_API_KEY not configured");
    return new Response("Missing API key", { status: 500 });
  }

  try {
    // Fetch live market data
    console.log("Fetching market data...");
    const marketData = await fetchMarketData();
    console.log("Market data fetched:", marketData.substring(0, 200));

    const now = new Date();
    const dateStr = now.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      timeZone: "America/Chicago",
    });

    const userPrompt = `Generate today's pre-market briefing for ${dateStr}.

Here is the current market data (fetched just now):
${marketData}

Current time: ${now.toISOString()}

Analyze this data and generate the full briefing JSON. Requirements:
- Support/resistance must be derived from the actual price data above, not invented round numbers
- Trading ideas must include exact strikes and expiration (e.g., "Sell SPY 560/555 put spread, 14 DTE, $1.20 credit")
- The aiSummary paragraphs must be dense, opinionated, and specific -- write like a Goldman Sachs morning note, not a blog post
- If VIX is elevated, the playbook should emphasize selling premium with defined risk
- If sectors show defensive rotation, flag it as institutional risk-off positioning
- Scenario matrix probabilities must sum to approximately 100%`;

    console.log("Calling Claude API...");
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 8192,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: userPrompt }],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("Claude API error:", response.status, errText);
      return new Response(`Claude API error: ${response.status}`, { status: 502 });
    }

    const result = await response.json();
    const content = result.content?.[0]?.text;
    if (!content) {
      return new Response("No content from Claude", { status: 502 });
    }

    // Parse and validate JSON
    let briefing;
    try {
      // Strip any markdown code fences if present
      const cleaned = content.replace(/^```json?\s*\n?/m, "").replace(/\n?```\s*$/m, "");
      briefing = JSON.parse(cleaned);
    } catch (parseErr) {
      console.error("Failed to parse briefing JSON:", parseErr);
      console.error("Raw content:", content.substring(0, 500));
      return new Response("Invalid JSON from Claude", { status: 502 });
    }

    // Add metadata
    briefing._meta = {
      generatedAt: now.toISOString(),
      model: "claude-sonnet-4-20250514",
      marketDataPoints: marketData.split("\n").length,
    };

    // Store in Netlify Blobs
    const store = getStore("briefings");
    const todayKey = now.toISOString().split("T")[0]; // YYYY-MM-DD

    await store.setJSON("latest", briefing);
    await store.setJSON(`daily/${todayKey}`, briefing);

    console.log(`Briefing generated and stored for ${todayKey}`);

    return new Response(JSON.stringify({ success: true, date: todayKey }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Briefing generation error:", err);
    return new Response(`Error: ${String(err)}`, { status: 500 });
  }
}

// Schedule: 6:00 AM Central Time daily (11:00 UTC during CDT, 12:00 UTC during CST)
// Using 11:00 UTC = 6 AM CDT (March-Nov) / 5 AM CST (Nov-Mar)
export const config: Config = {
  schedule: "0 11 * * *",
};
