import type { Context } from "@netlify/functions";
import { getStore } from "@netlify/blobs";

// Background function: gets 15 minutes timeout, returns 202 immediately.
// Calls Claude API to generate report content, stores in Netlify Blobs.

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
  } catch {
    return `${name}: unavailable`;
  }
}

const REPORT_SYSTEM_PROMPT = `You are the chief market strategist at an options-focused hedge fund writing the daily pre-market report for institutional clients. Brutally direct, numerically precise, no filler.

Output ONLY valid JSON matching this schema:

{
  "title": "string -- e.g. MONDAY MORNING PRE-MARKET REPORT",
  "dateSubtitle": "string -- March 15, 2026 | Week of March 10-14",
  "tagline": "string -- bold one-liner e.g. Oil Surging + Tech Under Pressure",
  "snapshotTime": "string -- MONDAY MORNING SNAPSHOT -- 7:00 AM CT",
  "criticalAlert": "string or null",
  "overnightRecap": { "title": "What Happened + Overnight", "subsections": [{ "heading": "string", "content": "string 3-5 sentences with numbers" }] },
  "tradeScorecard": { "title": "Prior-Day Calls Scorecard", "trades": [{ "ticker": "SYM", "call": "string", "grade": "RIGHT|WRONG|PARTIAL|TBD", "entryEst": "string", "actual": "string", "pnlEst": "string", "lesson": "string" }], "summary": "string" },
  "weeklyThesis": { "title": "Weekly Thesis Scorecard", "theses": [{ "thesis": "string", "grade": "RIGHT|WRONG|PARTIAL", "weekStatus": "string", "fridayPreview": "string" }], "summary": "string" },
  "binaryEvent": null,
  "tradeIdeas": { "title": "Today's Trade Ideas", "preamble": "string", "ideas": [{ "ticker": "SYM", "direction": "LONG|SHORT|HEDGE", "entry": "string", "stop": "string", "target": "string", "rr": "string", "thesis": "string 2 sentences", "riskFlags": "string" }] },
  "sectorOverview": { "title": "Sector Overview", "sectors": [{ "sector": "string", "weekChange": "string", "todayChange": "string", "signal": "BULL|BEAR|NEUTRAL|AVOID", "notes": "string" }] },
  "keyLevels": { "title": "Key Levels and Economic Calendar", "levels": [{ "metric": "string", "current": "string", "significance": "string" }] },
  "tomorrowPreview": { "title": "Tomorrow Preview", "subsections": [{ "heading": "string", "content": "string" }] },
  "bottomLine": { "title": "Bottom Line", "paragraphs": ["string 3-5 sentences each, 2-3 paragraphs"] },
  "disclaimer": "This report is for informational and educational purposes only. It does not constitute financial advice, a recommendation to buy or sell any security, or an offer to transact. Always do your own research and consult a licensed financial advisor before making investment decisions. Past performance is not indicative of future results."
}

Include 5-6 trade ideas, 8+ sectors, 10+ key levels. Every claim must cite a number. Be opinionated.`;

export default async function handler(_req: Request, _context: Context) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error("ANTHROPIC_API_KEY not set");
    return;
  }

  const store = getStore("reports");
  const now = new Date();
  const todayKey = now.toISOString().split("T")[0];

  try {
    // Mark as in-progress
    await store.setJSON(`status/${todayKey}`, { status: "generating", startedAt: now.toISOString() });

    // Fetch market data
    const symbolList = [
      { yahoo: "%5EGSPC", name: "S&P 500" }, { yahoo: "%5EVIX", name: "VIX" },
      { yahoo: "%5EDJI", name: "Dow" }, { yahoo: "%5EIXIC", name: "Nasdaq" },
      { yahoo: "SPY", name: "SPY" }, { yahoo: "QQQ", name: "QQQ" },
      { yahoo: "IWM", name: "IWM" }, { yahoo: "DIA", name: "DIA" },
      { yahoo: "CL%3DF", name: "WTI Crude" }, { yahoo: "%5ETNX", name: "10Y" },
      { yahoo: "GLD", name: "Gold" }, { yahoo: "BTC-USD", name: "Bitcoin" },
      { yahoo: "XLE", name: "XLE" }, { yahoo: "XLK", name: "XLK" },
      { yahoo: "XLF", name: "XLF" }, { yahoo: "XLU", name: "XLU" },
      { yahoo: "XLY", name: "XLY" }, { yahoo: "XLP", name: "XLP" },
    ];

    console.log("Fetching market data for report...");
    const marketResults = await Promise.all(symbolList.map(s => fetchYahooSymbol(s.yahoo, s.name)));
    const marketDataText = marketResults.join("\n");
    console.log("Market data fetched, calling Claude...");

    const dateStr = now.toLocaleDateString("en-US", {
      weekday: "long", year: "numeric", month: "long", day: "numeric", timeZone: "America/Chicago",
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
        system: REPORT_SYSTEM_PROMPT,
        messages: [{ role: "user", content: `Generate today's pre-market report for ${dateStr}.\n\nMarket data:\n${marketDataText}\n\nOutput ONLY valid JSON.` }],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("Claude API error:", response.status, errText);
      await store.setJSON(`status/${todayKey}`, { status: "error", error: `Claude API ${response.status}`, at: now.toISOString() });
      return;
    }

    const result = await response.json();
    const content = result.content?.[0]?.text;
    if (!content) {
      console.error("No content from Claude");
      await store.setJSON(`status/${todayKey}`, { status: "error", error: "No content from Claude", at: now.toISOString() });
      return;
    }

    let report: any;
    try {
      const cleaned = content.replace(/^```json?\s*\n?/m, "").replace(/\n?```\s*$/m, "");
      report = JSON.parse(cleaned);
    } catch {
      console.error("JSON parse failed:", content.substring(0, 300));
      await store.setJSON(`status/${todayKey}`, { status: "error", error: "JSON parse failed", at: now.toISOString() });
      return;
    }

    // Store report
    report._meta = { generatedAt: now.toISOString(), model: "claude-sonnet-4-20250514" };
    await store.setJSON(`daily/${todayKey}`, report);
    await store.setJSON(`status/${todayKey}`, { status: "ready", generatedAt: now.toISOString() });
    console.log(`Report generated and stored for ${todayKey}`);

  } catch (err) {
    console.error("Report generation error:", err);
    await store.setJSON(`status/${todayKey}`, { status: "error", error: String(err), at: now.toISOString() });
  }
}
