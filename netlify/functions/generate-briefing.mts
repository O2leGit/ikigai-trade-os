import type { Config, Context } from "@netlify/functions";
import { getStore } from "@netlify/blobs";

const SYSTEM_PROMPT = `You are an expert market analyst for IkigaiTradeOS, a professional options trading intelligence platform. Generate a comprehensive daily pre-market briefing in JSON format.

Your output must be valid JSON matching this exact structure (no markdown, no code fences, just raw JSON):

{
  "generatedAt": "ISO 8601 timestamp",
  "briefingDate": "Day of week, Month DD, YYYY",
  "briefingEdition": "Vol. I — Issue NNN",
  "aiSummary": {
    "generatedAt": "ISO 8601 timestamp",
    "paragraphs": ["3 paragraphs: overnight recap, macro data analysis, today's playbook with specific levels and trades"]
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
  ];

  const results: string[] = [];

  for (const sym of symbols) {
    try {
      const res = await fetch(
        `https://query1.finance.yahoo.com/v8/finance/chart/${sym.yahoo}?range=5d&interval=1d`
      );
      if (res.ok) {
        const data = await res.json();
        const meta = data.chart?.result?.[0]?.meta;
        const quotes = data.chart?.result?.[0]?.indicators?.quote?.[0];
        if (meta && quotes) {
          const closes = quotes.close?.filter((c: number | null) => c !== null) || [];
          const lastClose = closes[closes.length - 1];
          const prevClose = closes.length > 1 ? closes[closes.length - 2] : meta.chartPreviousClose;
          const change = prevClose ? ((lastClose - prevClose) / prevClose * 100).toFixed(2) : "N/A";
          results.push(`${sym.name}: $${lastClose?.toFixed(2)} (${change}%)`);
        }
      }
    } catch {
      results.push(`${sym.name}: Data unavailable`);
    }
  }

  // Fetch sector ETFs
  const sectorETFs = ["XLE", "XLK", "XLF", "XLV", "XLU", "XLY", "XLP", "XLI", "XLB", "XLRE"];
  for (const etf of sectorETFs) {
    try {
      const res = await fetch(
        `https://query1.finance.yahoo.com/v8/finance/chart/${etf}?range=5d&interval=1d`
      );
      if (res.ok) {
        const data = await res.json();
        const quotes = data.chart?.result?.[0]?.indicators?.quote?.[0];
        if (quotes) {
          const closes = quotes.close?.filter((c: number | null) => c !== null) || [];
          const lastClose = closes[closes.length - 1];
          const prevClose = closes.length > 1 ? closes[closes.length - 2] : null;
          const change = prevClose ? ((lastClose - prevClose) / prevClose * 100).toFixed(2) : "N/A";
          results.push(`${etf}: $${lastClose?.toFixed(2)} (${change}%)`);
        }
      }
    } catch {
      // skip
    }
  }

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

Analyze this data and generate the full briefing JSON. Be specific about support/resistance levels based on recent price action. Identify the current market regime and any active geopolitical or macro crises. Generate actionable trading ideas with specific entry/exit levels.`;

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
// Using 12:00 UTC to cover CST (March is CDT transition, but 12 UTC = 6 AM CST / 7 AM CDT)
export const config: Config = {
  schedule: "0 11 * * *",
};
