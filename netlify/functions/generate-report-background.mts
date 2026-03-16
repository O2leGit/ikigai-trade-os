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
    const highs = (quotes.high || []).filter((h: number | null) => h !== null);
    const lows = (quotes.low || []).filter((l: number | null) => l !== null);
    const volumes = (quotes.volume || []).filter((v: number | null) => v !== null);
    const lastClose = closes[closes.length - 1];
    const prevClose = closes.length > 1 ? closes[closes.length - 2] : meta.chartPreviousClose;
    const high = highs[highs.length - 1];
    const low = lows[lows.length - 1];
    const vol = volumes[volumes.length - 1];
    const change = prevClose ? ((lastClose - prevClose) / prevClose * 100).toFixed(2) : "N/A";
    const fiveDayHigh = highs.length > 0 ? Math.max(...highs).toFixed(2) : "N/A";
    const fiveDayLow = lows.length > 0 ? Math.min(...lows).toFixed(2) : "N/A";
    return `${name}: $${lastClose?.toFixed(2)} (${change}%) | H:${high?.toFixed(2)} L:${low?.toFixed(2)} | 5d range: ${fiveDayLow}-${fiveDayHigh} | Vol: ${vol ? (vol / 1e6).toFixed(1) + "M" : "N/A"}`;
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
      context: `PRE-MARKET MORNING BRIEF. Write like a Citadel pre-market desk note at 6:30 AM.

REQUIRED STRUCTURE:
- CRITICAL ALERT: Overnight catalyst that changes today's trading plan (if any). Exact futures levels and gap %.
- WHAT HAPPENED (3 subsections):
  * "Overnight Futures & Globex": ES/NQ/RTY futures levels, overnight range, volume. Gap analysis with exact % from yesterday's close.
  * "Asia & Europe Recap": Key index moves (Nikkei, Shanghai, DAX, FTSE) with exact %. Currency moves (DXY, EUR/USD, USD/JPY). Any developments that matter for US open.
  * "Pre-Market Movers": Top 5 movers with exact % and catalysts. Earnings beats/misses with revenue and EPS vs estimates.
- TODAY'S CALENDAR: Every data release with exact time CT, consensus estimate, and prior. Fed speakers with time and topic.
- TRADE IDEAS: 5-6 trades minimum.
  * 2 opening bell plays (first 30 min) with gap-up and gap-down scenarios
  * 2 intraday swing trades with key levels
  * 1-2 options trades with exact strikes, DTE, credit/debit
- SECTOR OVERVIEW: Pre-market sector moves and what to watch
- KEY LEVELS: Pivot levels, prior day high/low, overnight high/low, VWAP
- BOTTOM LINE: 3 paragraphs. Today's game plan with clear directional bias and high-conviction trade.`
    };
  }
  if (hour < 15) {
    return {
      title: `${dayName} INTRADAY MARKET UPDATE`,
      snapshot: `${dayName} INTRADAY SNAPSHOT -- ${hour}:00 CT`,
      context: `INTRADAY TACTICAL UPDATE. Write like a Morgan Stanley mid-day trading desk flash.

REQUIRED STRUCTURE:
- CRITICAL ALERT: Biggest development since the open that changes positioning. Include exact time and price.
- WHAT HAPPENED (3 subsections):
  * "Morning Session Recap": Gap and go or gap and fade? Key reversal points with exact times and prices. VWAP position. Volume vs average.
  * "Intraday Internals": A/D ratio, up/down volume, tick readings. Is this a conviction move or low-volume drift?
  * "Data Release Reactions": If any data came out this morning, how did the market react? Fed speaker impacts?
- TRADE SCORECARD: Grade pre-market ideas. What hit targets, what stopped out, what's still live.
- TRADE IDEAS: 5-6 trades.
  * 2 afternoon session plays for power hour (2:30-3:00 PM) setups
  * 2 mean reversion or trend continuation plays
  * 1-2 closing plays for overnight positioning
- SECTOR OVERVIEW: Intraday rotation with exact % changes. Which sectors gained/lost momentum since open.
- KEY LEVELS: Updated intraday levels. Where are stops clustered? What triggers a breakout or breakdown?
- BOTTOM LINE: 3 paragraphs. Is the morning move sustainable? Exactly what to do in the last 2 hours. Clear directional view into close.`
    };
  }
  return {
    title: `${dayName} END OF DAY REPORT`,
    snapshot: `${dayName} CLOSING SNAPSHOT -- 3:00 PM CT`,
    context: `END OF DAY CLOSING REPORT. Write like a Goldman Sachs or Citadel daily close wrap sent to portfolio managers and institutional clients. This is the most important report of the day -- traders need to know what happened, what it means, and exactly how to position for tomorrow.

REQUIRED STRUCTURE (follow this exactly):
- CRITICAL ALERT: The #1 thing from today's close that changes tomorrow's setup. After-hours earnings reactions with exact % moves, Fed speaker comments, geopolitical shifts. If nothing critical, state "No critical overnight risks identified."
- WHAT HAPPENED (3-4 detailed subsections):
  * "Session Narrative": Full open-to-close story. Where did we open vs yesterday's close (gap up/down %)? Key intraday reversals with exact times and prices. Was the move front-loaded (morning) or back-loaded (power hour)? Closing tick and VWAP position. Volume vs 20-day average.
  * "Breadth & Internals": NYSE advance/decline ratio. New highs vs new lows. Up volume vs down volume. Was this a broad-based move or narrow leadership?
  * "Volatility Analysis": VIX close vs open vs yesterday. VIX term structure (front month vs back month). Put/call ratio. Was hedging demand increasing or decreasing?
  * "After-Hours Movers": Key earnings reporting after the bell. Initial reactions with exact % moves. Guidance implications for the sector.
- TRADE SCORECARD: Grade trade ideas with RIGHT/WRONG/PARTIAL. Include estimated P&L for each trade. Calculate daily win rate. One sentence on what the market taught us today.
- WEEKLY THESIS: 2-3 running theses for the week. Is each one tracking RIGHT or WRONG? What new evidence today? How does today's action change the rest-of-week outlook?
- TRADE IDEAS (5-6 minimum):
  * 2 swing trades to hold overnight with exact entry/stop/target
  * 2 tomorrow opening plays with gap scenarios (what to do if gaps up vs gaps down)
  * 1-2 options-specific trades (spreads, strangles) with exact strikes, DTE, credit/debit, max risk
  * Every trade: entry price, stop loss, profit target, risk/reward ratio, thesis in 2 sentences
- SECTOR OVERVIEW: All 11 sectors with today's % change and signal. Highlight rotation: which sectors gained/lost relative strength today? What does the rotation pattern tell us about the market's next move?
- KEY LEVELS: 12+ levels including SPX/QQQ/IWM/VIX support+resistance, 10Y yield key levels, oil levels, and any overnight levels that matter
- TOMORROW PREVIEW:
  * "Economic Calendar": Every data release with exact time CT, consensus estimate, and what bull vs bear outcome looks like
  * "Earnings": Pre-market and after-close reporters with estimates and sector impact
  * "Technical Setup": Key chart levels, overnight range, where are the stops clustered?
- BOTTOM LINE: 3 paragraphs minimum.
  * P1: What did today's price action TELL us about the market's true direction? Not just what moved, but what it MEANS.
  * P2: Specific positioning for tomorrow -- exactly which side to favor and why. Include the one high-conviction trade if you could only make one trade tomorrow.
  * P3: Rest-of-week outlook. How does today change the weekly thesis? What's the biggest risk and biggest opportunity through Friday?`
  };
}

const REPORT_SYSTEM_PROMPT = `You are the chief market strategist at an elite options-focused hedge fund, writing the daily market intelligence report for institutional clients, family offices, and professional traders. Your reports compete with Goldman Sachs FICC desk notes, Citadel strategy memos, and JPMorgan Guide to the Markets. You are brutally direct, numerically precise, deeply analytical, and every sentence must deliver actionable intelligence.

QUALITY STANDARDS:
- Write like a $500K/year sell-side strategist, not a chatbot or news aggregator
- Every subsection must contain 3+ specific numbers derived from the data provided
- Cross-reference data: if VIX drops 13% and SPX rises 1%, explain the causal link and what it means for options pricing
- Connect sector moves to macro: if XLK leads while XLE lags, name the regime shift and its implications
- Trade ideas must have EXACT strikes, DTE, credit/debit, risk/reward, and entry triggers
- Support/resistance must be derived from actual data (5-day range, prior close, round numbers)
- No filler: never write "traders should monitor" or "markets will be watching" -- say exactly WHAT TO DO and WHEN
- The "What Happened" section should read like a detailed session narrative, not a bullet list of stats
- Trade scorecard should be honest -- mark trades WRONG when they lost money
- Bottom Line must be 3 full paragraphs with conviction views, not generic hedging

Output ONLY valid JSON matching this schema:

{
  "title": "string -- USE THE EXACT TITLE PROVIDED IN THE PROMPT",
  "dateSubtitle": "string -- March 15, 2026 | Week of March 10-14",
  "tagline": "string -- bold one-liner that captures today's theme e.g. Oil Collapse + Tech Revival = Risk-On Regime Shift",
  "snapshotTime": "string -- USE THE EXACT SNAPSHOT TIME PROVIDED IN THE PROMPT",
  "criticalAlert": "string or null -- must be specific: ticker, price, time, and why it matters for tomorrow",
  "overnightRecap": { "title": "What Happened", "subsections": [{ "heading": "string", "content": "string 5-8 sentences with specific numbers, times, prices, and cross-references" }] },
  "tradeScorecard": { "title": "Trade Scorecard", "trades": [{ "ticker": "SYM", "call": "string including exact entry and target", "grade": "RIGHT|WRONG|PARTIAL|TBD", "entryEst": "string with price", "actual": "string with price", "pnlEst": "string e.g. +$420 or -$180", "lesson": "string -- specific takeaway" }], "summary": "string with win rate % and total estimated P&L" },
  "weeklyThesis": { "title": "Weekly Thesis Scorecard", "theses": [{ "thesis": "string", "grade": "RIGHT|WRONG|PARTIAL", "weekStatus": "string with numbers", "fridayPreview": "string with specific targets" }], "summary": "string" },
  "binaryEvent": null,
  "tradeIdeas": { "title": "Trade Ideas", "preamble": "string -- 2 sentences on the setup and what types of trades to favor", "ideas": [{ "ticker": "SYM", "direction": "LONG|SHORT|HEDGE", "entry": "string with exact price", "stop": "string with exact price", "target": "string with exact price", "rr": "string e.g. 2.4:1", "thesis": "string 2-3 sentences with specific catalysts and numbers", "riskFlags": "string -- what could go wrong" }] },
  "sectorOverview": { "title": "Sector Overview", "sectors": [{ "sector": "string with ETF ticker e.g. Technology (XLK)", "weekChange": "string e.g. +2.8%", "todayChange": "string e.g. +1.45%", "signal": "BULL|BEAR|NEUTRAL|AVOID", "notes": "string -- specific driver and key stock moves" }] },
  "keyLevels": { "title": "Key Levels & Economic Calendar", "levels": [{ "metric": "string", "current": "string", "significance": "string -- what happens if this level breaks" }] },
  "tomorrowPreview": { "title": "Tomorrow Preview", "subsections": [{ "heading": "string", "content": "string 4-6 sentences with exact times, estimates, and scenario analysis" }] },
  "bottomLine": { "title": "Bottom Line", "paragraphs": ["string 5-7 sentences each -- MUST be 3 full paragraphs with conviction views, specific trades, and clear directional bias"] },
  "disclaimer": "This report is for informational and educational purposes only. It does not constitute financial advice, a recommendation to buy or sell any security, or an offer to transact. Always do your own research and consult a licensed financial advisor before making investment decisions. Past performance is not indicative of future results."
}

REQUIREMENTS: 5-6 trade ideas (mix of stock and options trades with exact strikes), 11 sectors minimum, 12+ key levels, 3-4 subsections in What Happened, 3 subsections in Tomorrow Preview. Every claim must cite a number. Be opinionated and take a clear directional stance.`;

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
      // Core indices
      { yahoo: "%5EGSPC", name: "S&P 500" }, { yahoo: "%5EVIX", name: "VIX" },
      { yahoo: "%5EDJI", name: "Dow" }, { yahoo: "%5EIXIC", name: "Nasdaq" },
      { yahoo: "SPY", name: "SPY" }, { yahoo: "QQQ", name: "QQQ" },
      { yahoo: "IWM", name: "IWM (Russell 2000)" }, { yahoo: "DIA", name: "DIA" },
      // All 11 sectors
      { yahoo: "XLK", name: "XLK (Tech)" }, { yahoo: "XLE", name: "XLE (Energy)" },
      { yahoo: "XLF", name: "XLF (Financials)" }, { yahoo: "XLV", name: "XLV (Healthcare)" },
      { yahoo: "XLU", name: "XLU (Utilities)" }, { yahoo: "XLY", name: "XLY (Discretionary)" },
      { yahoo: "XLP", name: "XLP (Staples)" }, { yahoo: "XLI", name: "XLI (Industrials)" },
      { yahoo: "XLB", name: "XLB (Materials)" }, { yahoo: "XLRE", name: "XLRE (Real Estate)" },
      { yahoo: "XLC", name: "XLC (Comms)" },
      // Macro signals
      { yahoo: "CL%3DF", name: "WTI Crude" }, { yahoo: "%5ETNX", name: "10Y Yield" },
      { yahoo: "GLD", name: "Gold" }, { yahoo: "TLT", name: "TLT (20Y+ Bonds)" },
      { yahoo: "BTC-USD", name: "Bitcoin" },
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
        max_tokens: 12000,
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

    // Store report with edition metadata
    const edition = getReportEdition(now);
    report._meta = {
      generatedAt: now.toISOString(),
      model: "claude-sonnet-4-20250514",
      editionKey: edition.title.toLowerCase().includes("pre-market") ? "premarket"
        : edition.title.toLowerCase().includes("intraday") ? "intraday"
        : edition.title.toLowerCase().includes("end of day") ? "eod"
        : edition.title.toLowerCase().includes("end of week") ? "endofweek"
        : edition.title.toLowerCase().includes("week ahead") ? "weekahead"
        : "other",
      editionLabel: edition.title,
    };
    const edKey = report._meta.editionKey;
    await store.setJSON(`daily/${todayKey}`, report);
    await store.setJSON(`archive/${todayKey}/${edKey}`, report);

    // Update report archive index
    try {
      const indexRaw = await store.get("archive-index");
      const index: any[] = indexRaw ? JSON.parse(indexRaw) : [];
      index.unshift({
        date: todayKey,
        edition: edKey,
        editionLabel: edition.title,
        title: report.title || edition.title,
        tagline: report.tagline || "",
        generatedAt: now.toISOString(),
      });
      await store.set("archive-index", JSON.stringify(index.slice(0, 120)));
    } catch { /* non-fatal */ }

    await store.setJSON(`status/${todayKey}`, { status: "ready", generatedAt: now.toISOString() });
    console.log(`Report generated and stored for ${todayKey}`);

  } catch (err) {
    console.error("Report generation error:", err);
    await store.setJSON(`status/${todayKey}`, { status: "error", error: String(err), at: now.toISOString() });
  }
}
