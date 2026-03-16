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

// ── Context-aware edition detection ──
function getReportEdition(now: Date): { title: string; snapshot: string; context: string } {
  const ct = new Date(now.toLocaleString("en-US", { timeZone: "America/Chicago" }));
  const hour = ct.getHours();
  const dayOfWeek = ct.getDay();
  const dayName = ["SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"][dayOfWeek];

  if (dayOfWeek === 6) {
    return {
      title: `END OF WEEK REPORT & WEEKLY SCORECARD`,
      snapshot: `SATURDAY REVIEW -- ${hour}:00 AM CT`,
      context: `SATURDAY END-OF-WEEK REVIEW. Write like a Goldman Sachs weekly strategy note. Structure:
- CRITICAL ALERT: Biggest risk or opportunity from the week that carries into next week
- WHAT HAPPENED: Full week recap with Monday-Friday day-by-day progression of key moves. Which sectors rotated in/out. How VIX term structure evolved. Key levels that broke or held.
- TRADE SCORECARD: Grade each trade idea from the week (RIGHT/WRONG/PARTIAL). Calculate win rate and total P&L estimate. Identify what the market taught us.
- WEEKLY THESIS: Was our thesis right? What did we miss? What surprised us?
- SECTOR OVERVIEW: Full sector performance for the week with clear winners/losers and rotation signals
- TRADE IDEAS: Swing trades to put on Monday morning. These should be 2-4 week positions based on weekly chart setups, not day trades.
- BOTTOM LINE: 2-3 paragraphs on what to expect next week and how to position for it.`
    };
  }
  if (dayOfWeek === 0) {
    return {
      title: `WEEK AHEAD PREVIEW & STRATEGY MEMO`,
      snapshot: `SUNDAY BRIEFING -- ${hour}:00 AM CT`,
      context: `SUNDAY WEEK-AHEAD STRATEGY MEMO. Write like a JPMorgan Monday morning strategy note sent to the trading desk Sunday night. Structure:
- CRITICAL ALERT: Single biggest event risk this week (FOMC, CPI, earnings, etc.) and how to position
- WHAT HAPPENED: Brief recap of Friday close and weekend developments (geopolitical, crypto, futures)
- WEEK AHEAD CALENDAR: Every major event this week with exact dates/times and expected market impact. For each event, specify: what the consensus expects, what would be bullish vs bearish, and the specific options trade to put on
- TRADE IDEAS: Monday opening trades (first 30 min plays) + weekly swing setups. Each with exact strikes, DTE, entry/stop/target
- SECTOR OVERVIEW: Coming week's sector catalysts (earnings by sector, data releases affecting sectors)
- KEY LEVELS: Support/resistance for SPX, QQQ, IWM, VIX for the coming week
- BOTTOM LINE: The ONE trade you'd make if you could only make one this week. Full conviction thesis.`
    };
  }
  if (hour < 9) {
    return {
      title: `${dayName} MORNING PRE-MARKET REPORT`,
      snapshot: `${dayName} MORNING SNAPSHOT -- 7:00 AM CT`,
      context: `PRE-MARKET MORNING BRIEF. Write like a Citadel pre-market desk note at 6:30 AM. Structure:
- CRITICAL ALERT: Overnight catalyst that changes today's trading plan (if any)
- WHAT HAPPENED: Overnight futures action, Asia/Europe session recap, pre-market movers with exact % moves. Gap analysis: is SPY gapping up/down and by how much?
- TODAY'S CALENDAR: Economic data releases with exact times, earnings before the bell, Fed speakers
- TRADE IDEAS: Opening bell plays for the first 30 minutes. Overnight gap fade vs trend trades. Exact entries, stops, targets for 0DTE and intraday positions
- SECTOR OVERVIEW: Pre-market sector ETF moves, which sectors to watch today
- KEY LEVELS: Today's pivot levels, prior day high/low, overnight high/low
- BOTTOM LINE: Today's game plan in 3 sentences. What's the setup and how do we trade it?`
    };
  }
  if (hour < 15) {
    return {
      title: `${dayName} INTRADAY MARKET UPDATE`,
      snapshot: `${dayName} INTRADAY SNAPSHOT -- ${hour}:00 CT`,
      context: `INTRADAY TACTICAL UPDATE. Write like a Morgan Stanley mid-day trading desk flash. Structure:
- CRITICAL ALERT: Biggest development since the open that changes positioning
- WHAT HAPPENED: Morning session recap. Did we gap and go or gap and fade? Key movers and why. Volume analysis -- is this a real move or low conviction?
- LIVE SCORECARD: Grade morning trade ideas (if pre-market report was generated). What hit, what stopped out
- TRADE IDEAS: Afternoon session plays. Power hour setups (2:30-3:00 PM). Mean reversion if morning was trending, breakout continuation if volume confirms. Exact strikes and entries
- SECTOR OVERVIEW: Intraday rotation -- which sectors are gaining/losing momentum mid-session
- KEY LEVELS: Updated intraday levels based on morning action. Where are the stops clustered?
- BOTTOM LINE: Is the morning move sustainable? What to do in the last 2 hours.`
    };
  }
  return {
    title: `${dayName} END OF DAY REPORT`,
    snapshot: `${dayName} CLOSING SNAPSHOT -- 3:00 PM CT`,
    context: `END OF DAY CLOSING REPORT. Write like a Deutsche Bank end-of-day market wrap sent to portfolio managers. Structure:
- CRITICAL ALERT: Closing development that affects tomorrow's open (after-hours earnings, Fed comments, geopolitical)
- WHAT HAPPENED: Full session narrative. Open to close story. Key reversal points and why. Volume vs average -- was this a conviction day? Breadth analysis (advance/decline). Where did the market close relative to its range?
- TRADE SCORECARD: Grade ALL trade ideas from today's reports (RIGHT/WRONG/PARTIAL). Win rate and estimated P&L
- AFTER HOURS: Key earnings reporting after the bell with expectations and initial reactions
- TRADE IDEAS: Overnight holds (swing trades to keep). Tomorrow's opening setup based on today's close. Which side of the market to favor tomorrow
- SECTOR OVERVIEW: End-of-day sector performance, rotation signals for tomorrow
- KEY LEVELS: Closing levels that matter for tomorrow. Where does support/resistance reset?
- BOTTOM LINE: What did the market tell us today? One-paragraph conviction view for tomorrow.`
  };
}

const REPORT_SYSTEM_PROMPT = `You are the chief market strategist at an options-focused hedge fund writing the daily market report for institutional clients. Brutally direct, numerically precise, no filler. The report title and snapshot time will be provided -- use them exactly.

Output ONLY valid JSON matching this schema:

{
  "title": "string -- USE THE EXACT TITLE PROVIDED IN THE PROMPT",
  "dateSubtitle": "string -- March 15, 2026 | Week of March 10-14",
  "tagline": "string -- bold one-liner e.g. Oil Surging + Tech Under Pressure",
  "snapshotTime": "string -- USE THE EXACT SNAPSHOT TIME PROVIDED IN THE PROMPT",
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
        messages: [{ role: "user", content: `Generate the market report for ${dateStr}.\n\nREPORT TITLE: ${getReportEdition(now).title}\nSNAPSHOT TIME: ${getReportEdition(now).snapshot}\nCONTEXT: ${getReportEdition(now).context}\n\nMarket data:\n${marketDataText}\n\nUse the EXACT title and snapshot time provided above. Output ONLY valid JSON.` }],
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
