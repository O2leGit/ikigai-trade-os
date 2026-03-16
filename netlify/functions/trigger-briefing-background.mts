import type { Context } from "@netlify/functions";
import { getStore } from "@netlify/blobs";

// Background function: returns 202 immediately, gets 15-minute timeout.
// Fetches market data, calls Claude API, stores briefing in Netlify Blobs.
// Context-aware: pre-market, intraday, end-of-day, weekend editions.

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
  } catch (err) {
    return `${name}: ${err instanceof Error ? err.message : "unavailable"}`;
  }
}

// ── Context-aware edition detection ──
function getEdition(now: Date): { edition: string; editionKey: string; context: string } {
  const ct = new Date(now.toLocaleString("en-US", { timeZone: "America/Chicago" }));
  const hour = ct.getHours();
  const minute = ct.getMinutes();
  const dayOfWeek = ct.getDay(); // 0=Sun, 6=Sat
  const timeDecimal = hour + minute / 60;

  if (dayOfWeek === 0 || dayOfWeek === 6) {
    return {
      edition: "Weekend Report & Week Ahead Preview",
      editionKey: "weekend",
      context: "Markets are closed. Focus on: (1) recap of the week that just ended with key winners/losers, (2) what to watch next week including upcoming economic data, earnings, and event risks, (3) positioning recommendations for Monday open, (4) swing trade setups developing over the weekend. Be forward-looking."
    };
  }

  if (timeDecimal < 8.5) {
    return {
      edition: "Pre-Market Intelligence Report",
      editionKey: "premarket",
      context: "Markets have not opened yet. Focus on: (1) overnight futures action and gap direction, (2) key pre-market movers, (3) what happened in Asia/Europe overnight, (4) today's economic calendar events with exact times, (5) opening trade playbook with exact entries for the first 30 minutes."
    };
  }

  if (timeDecimal < 15) {
    return {
      edition: "Intraday Market Update",
      editionKey: "intraday",
      context: "Markets are currently open and trading. Focus on: (1) how the session is developing vs pre-market expectations, (2) intraday technical levels being tested, (3) volume and breadth analysis, (4) any breaking news or data releases from today, (5) tactical adjustments to existing positions and new intraday opportunities."
    };
  }

  return {
    edition: "End of Day Report & Tomorrow Preview",
    editionKey: "eod",
    context: "Markets have closed or are closing. Focus on: (1) full session recap with closing levels and key movers, (2) what worked and what didn't today, (3) after-hours earnings and their implications, (4) overnight risk factors, (5) positioning for tomorrow's open with specific trades to put on."
  };
}

const SYSTEM_PROMPT = `You are the chief market strategist at IkigaiTradeOS, a premium institutional-grade market intelligence platform. Your briefings compete with Goldman Sachs morning notes, JPMorgan's Guide to the Markets, and Citadel's internal strategy memos. You are brutally direct, numerically precise, and every sentence must deliver actionable intelligence.

CRITICAL QUALITY STANDARDS:
- Write like a $500K/year sell-side strategist, not a chatbot
- Every paragraph must contain at least 3 specific numbers from the data
- Cross-reference data points: if VIX drops 13% and SPY gains 1%, explain WHY and WHAT IT MEANS for positioning
- Connect sector rotation to macro narrative: if XLK leads while XLE lags, explain the regime shift
- Name exact strike prices, exact DTE, exact credit/debit amounts in every trade idea
- Support/resistance must come from actual price levels in the data (5-day high/low, prior close)
- No filler phrases like "markets are watching" or "traders should be cautious" -- say exactly WHAT TO DO

AI SUMMARY QUALITY (the 3 paragraphs in aiSummary must be your BEST work):
- P1 MARKET NARRATIVE: Open with the single most important thing that happened. Lead with the biggest mover and WHY. Cross-reference: "VIX collapsed -13.5% to $23.51 as SPX surged +1.01% to $6699 -- this VIX/SPX divergence signals [X]." Mention overnight futures, Asia/Europe, any gaps. Reference sector rotation data. End with the key level everyone is watching.
- P2 REGIME & VOL SYNTHESIS: Quantify the vol regime shift with exact numbers. "IV Rank dropped from X to Y, moving from [regime] to [regime]." Map sector leadership to risk appetite: "XLK +1.7% leading, XLE -4.5% lagging = growth-over-value rotation, classic risk-on." Connect to macro: rates, oil, gold moves and what they signal together. Grade the overall setup A-F for premium sellers.
- P3 EXACT PLAYBOOK: No generic advice. Name 2-3 specific trades with full details: "TRADE 1: Sell SPY 675/670 put spread, 21 DTE, targeting $2.00 credit ($1:$3 risk/reward). Enter if SPY holds $665 support. TRADE 2: [...]" Include position sizing as % of portfolio. State the ONE thing that would invalidate this thesis.

ANALYSIS RULES:
- VIX > 25 = elevated, sell premium aggressively with defined risk. VIX < 15 = vol is cheap, buy it
- IV Rank > 50 = premium is rich, favor selling. IV Rank < 30 = premium is cheap, favor buying
- Sector rotation signals: defensive leadership (XLU/XLP up, XLY/XLK down) = risk-off
- Always calculate expected moves: price * (VIX/100) * sqrt(DTE/365)
- Reference the 5-day range for support/resistance levels

Output ONLY valid JSON (no markdown fences). Include these top-level keys: generatedAt, briefingDate, briefingEdition, aiSummary (with generatedAt + paragraphs array of 3 strings following the P1/P2/P3 quality standards above), keyLevels (array of 4 objects with symbol/name/price/change/direction/support/resistance/trend), fearGauge (vix/vixChange/vixTrend/putCallRatio/putCallSignal/ivRank/fearLevel), overnightDevelopments (array), crisisStatus (object), marketRegime (object with classification/description/bestStrategies), executiveView (string paragraph), tradingIdeas (object with dayTrades/swingTrades/hedges arrays -- each trade object MUST have: ticker, direction "LONG"/"SHORT", horizon "Intraday"/"2-5 days"/"2-4 weeks", thesis, trade string with exact strikes/DTE/credit, entry, target, stop, sizing, conviction "HIGH"/"MEDIUM"/"LOW", rr), scenarioMatrix (array), decisionSummary (object with bestOpportunityToday/bestSwingIdeaThisWeek/biggestRiskToWatch strings), sectorRotation (array), macroConditions (array), earningsPlays (array of 3-5 objects with ticker/company/reportDate/reportTime/setup/conviction/trade/bullCase/bearCase/keyLevels/expectedMove).`;

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

    // Expanded market data -- more symbols for richer analysis
    const symbols = [
      { yahoo: "%5EGSPC", name: "S&P 500" },
      { yahoo: "%5EVIX", name: "VIX" },
      { yahoo: "SPY", name: "SPY" },
      { yahoo: "QQQ", name: "QQQ" },
      { yahoo: "IWM", name: "IWM (Russell 2000)" },
      { yahoo: "DIA", name: "DIA (Dow)" },
      { yahoo: "%5EIXIC", name: "Nasdaq Composite" },
      // Sectors for rotation analysis
      { yahoo: "XLK", name: "XLK (Tech)" },
      { yahoo: "XLE", name: "XLE (Energy)" },
      { yahoo: "XLF", name: "XLF (Financials)" },
      { yahoo: "XLV", name: "XLV (Healthcare)" },
      { yahoo: "XLU", name: "XLU (Utilities)" },
      { yahoo: "XLY", name: "XLY (Discretionary)" },
      { yahoo: "XLP", name: "XLP (Staples)" },
      // Macro signals
      { yahoo: "GLD", name: "Gold (GLD)" },
      { yahoo: "CL%3DF", name: "WTI Crude Oil" },
      { yahoo: "%5ETNX", name: "10Y Treasury Yield" },
      { yahoo: "TLT", name: "TLT (20Y+ Bonds)" },
    ];

    console.log("Fetching market data for briefing...");
    const marketResults = await Promise.all(symbols.map(s => fetchYahooSymbol(s.yahoo, s.name)));
    const marketData = marketResults.join("\n");
    console.log("Market data fetched, calling Claude...");

    // Context-aware edition
    const { edition, editionKey, context: editionContext } = getEdition(now);

    const dateStr = now.toLocaleDateString("en-US", {
      weekday: "long", year: "numeric", month: "long", day: "numeric",
      timeZone: "America/Chicago",
    });

    const timeStr = now.toLocaleTimeString("en-US", {
      hour: "numeric", minute: "2-digit",
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
        max_tokens: 7000,
        system: SYSTEM_PROMPT,
        messages: [{
          role: "user",
          content: `Generate the ${edition} for ${dateStr} at ${timeStr} CT.\n\nEDITION CONTEXT: ${editionContext}\n\nSet briefingEdition to "${edition}" and briefingDate to "${dateStr}".\n\nMarket data:\n${marketData}\n\nOutput ONLY valid JSON.`,
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

    // Store briefing with metadata
    briefing._meta = {
      generatedAt: now.toISOString(),
      model: "claude-sonnet-4-20250514",
      edition: editionKey,
      editionLabel: edition,
    };

    // Store as latest + daily + archive
    await store.setJSON("latest", briefing);
    await store.setJSON(`daily/${todayKey}`, briefing);
    await store.setJSON(`archive/${todayKey}/${editionKey}`, briefing);

    // Update archive index
    try {
      const indexRaw = await store.get("archive-index");
      const index: any[] = indexRaw ? JSON.parse(indexRaw) : [];
      index.unshift({
        date: todayKey,
        edition: editionKey,
        editionLabel: edition,
        generatedAt: now.toISOString(),
      });
      // Keep last 120 entries (roughly 30 days x 4 editions)
      await store.set("archive-index", JSON.stringify(index.slice(0, 120)));
    } catch {
      // Non-fatal
    }

    await store.setJSON("briefing-status", { status: "ready", generatedAt: now.toISOString() });
    console.log(`Briefing [${edition}] generated and stored for ${todayKey}`);

  } catch (err) {
    console.error("Briefing generation error:", err);
    try {
      await store.setJSON("briefing-status", { status: "error", error: String(err), at: now.toISOString() });
    } catch (storeErr) {
      console.error("Failed to write error status:", storeErr);
    }
  }
}
