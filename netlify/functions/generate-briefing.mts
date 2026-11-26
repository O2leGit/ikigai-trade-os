import type { Context } from "@netlify/functions";
import { anthropicMessagesViaOpenRouter } from "./_llm.mts";
import { getStore } from "@netlify/blobs";
import { quoteLine, stock, type SymbolSpec } from "../../shared/marketProviders";

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

// Market data for the prompt comes through the shared multi-provider helper:
// ETFs resolve via Finnhub/Twelve Data/Polygon (whichever key is set), with
// Yahoo as the fallback for indices/futures. This avoids the Yahoo-direct calls
// that are blocked from serverless IPs -- which is what left the AI briefing
// generated from "HTTP 403" strings (i.e. not up to date).
const MARKET_SYMBOLS: (SymbolSpec & { label: string })[] = [
  { yahoo: "^GSPC", label: "S&P 500" },
  { yahoo: "^VIX", label: "VIX" },
  { yahoo: "^DJI", label: "Dow Jones" },
  { yahoo: "^IXIC", label: "Nasdaq" },
  { yahoo: "CL=F", label: "Crude Oil" },
  { yahoo: "^TNX", label: "10Y Treasury" },
  { ...stock("SPY"), label: "SPY ETF" },
  { ...stock("QQQ"), label: "QQQ ETF" },
  { ...stock("IWM"), label: "IWM ETF" },
  { ...stock("DIA"), label: "DIA ETF" },
  { ...stock("GLD"), label: "Gold ETF" },
  { ...stock("XLE"), label: "XLE" },
  { ...stock("XLK"), label: "XLK" },
  { ...stock("XLF"), label: "XLF" },
  { ...stock("XLV"), label: "XLV" },
  { ...stock("XLU"), label: "XLU" },
  { ...stock("XLY"), label: "XLY" },
  { ...stock("XLP"), label: "XLP" },
  { ...stock("XLI"), label: "XLI" },
  { ...stock("XLB"), label: "XLB" },
  { ...stock("XLRE"), label: "XLRE" },
];

async function fetchMarketData(): Promise<string> {
  const results = await Promise.all(MARKET_SYMBOLS.map((s) => quoteLine(s)));
  return results.join("\n");
}

export default async function handler(_req: Request, _context: Context) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    console.error("OPENROUTER_API_KEY not configured");
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

    console.log("Calling LLM...");
    const response = await anthropicMessagesViaOpenRouter({
        max_tokens: 8192,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: userPrompt }],
      });

    if (!response.ok) {
      const errText = response.errText ?? "";
      console.error("Claude API error:", response.status, errText);
      return new Response(`Claude API error: ${response.status}`, { status: 502 });
    }

    const result = response;
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
      model: response.model,
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

// NOTE: this function is intentionally NOT scheduled anymore. It used to fire
// at 11:00 UTC, the same minute scheduled-briefing dispatches
// trigger-briefing-background -- two full LLM generations racing to overwrite
// briefings/latest with *different* aiSummary schemas (paragraphs vs sections).
// scheduled-briefing.mts is now the single scheduler; this remains callable
// manually for the legacy paragraphs-format briefing.
