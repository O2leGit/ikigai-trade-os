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
- Every bullet must contain specific numbers from the data
- Cross-reference data points: if VIX drops 13% and SPY gains 1%, explain WHY and WHAT IT MEANS
- Connect sector rotation to macro narrative: if XLK leads while XLE lags, explain the regime shift
- Name exact strike prices, exact DTE, exact credit/debit amounts in every trade idea
- Support/resistance must come from actual price levels in the data (5-day high/low, prior close)
- No filler phrases like "markets are watching" or "traders should be cautious" -- say exactly WHAT TO DO

AI SUMMARY FORMAT (aiSummary must be structured with sections, NOT plain paragraphs):
The aiSummary object must have: generatedAt (string), sections (array of section objects).
Each section object has: title (string), type ("bullets" | "metrics" | "trades"), items (array of strings for bullets, array of metric objects for metrics, array of trade objects for trades).

REQUIRED SECTIONS (in this exact order):
1. title: "Market Pulse" type: "metrics" -- 4-6 key metrics as objects with: label, value, change (string like "+1.01%"), signal ("bull"/"bear"/"neutral"). Include: SPX level+change, VIX level+change, 10Y yield, oil, best sector, worst sector.
2. title: "What Moved & Why" type: "bullets" -- 4-6 bullet points. Lead each bullet with a BOLD ticker or theme. Every bullet must have 2+ numbers. Example: "**SPX +1.01% to 5,699** on broad risk-on as VIX collapsed -13.5%; 427 advancers vs 98 decliners signals institutional conviction." Cross-reference moves: connect VIX to SPX, oil to energy sector, rates to utilities/tech.
3. title: "Regime & Vol Setup" type: "bullets" -- 3-4 bullets on volatility regime, IV rank, sector rotation signal, and overall grade (A-F) for premium sellers. Example: "**Vol Regime: Transitioning** -- VIX at 23.51 down from 27.19, IV Rank ~45th percentile. Premium selling window opening but not fully ripe."
4. title: "Actionable Trades" type: "trades" -- 2-3 specific trades as objects with: name (string, e.g. "SPY Put Credit Spread"), direction ("SELL"/"BUY"), details (string with exact strikes, DTE, credit/debit, risk/reward), trigger (string, the entry condition), invalidation (string, what kills the thesis).
5. title: "Key Risks" type: "bullets" -- 2-3 bullets on biggest risks and what to watch. Be specific: "**FOMC Minutes Wed 2pm ET** -- if hawkish surprise, SPX targets 5,620 support; hedge with VIX 28 calls."

ANALYSIS RULES:
- VIX > 25 = elevated, sell premium aggressively with defined risk. VIX < 15 = vol is cheap, buy it
- IV Rank > 50 = premium is rich, favor selling. IV Rank < 30 = premium is cheap, favor buying
- Sector rotation signals: defensive leadership (XLU/XLP up, XLY/XLK down) = risk-off
- Always calculate expected moves: price * (VIX/100) * sqrt(DTE/365)
- Reference the 5-day range for support/resistance levels

Output ONLY valid JSON (no markdown fences). Include these top-level keys: generatedAt, briefingDate, briefingEdition, aiSummary (with generatedAt + sections array following the format above), keyLevels (array of 4 objects with symbol/name/price/change/direction/support/resistance/trend), fearGauge (vix/vixChange/vixTrend/putCallRatio/putCallSignal/ivRank/fearLevel), overnightDevelopments (array), crisisStatus (object), marketRegime (object with classification/description/bestStrategies), executiveView (string paragraph), tradingIdeas (object with dayTrades/swingTrades/hedges arrays -- each trade object MUST have: ticker, direction "LONG"/"SHORT", horizon "Intraday"/"2-5 days"/"2-4 weeks", thesis, trade string with exact strikes/DTE/credit, entry, target, stop, sizing, conviction "HIGH"/"MEDIUM"/"LOW", rr), scenarioMatrix (array), decisionSummary (object with bestOpportunityToday/bestSwingIdeaThisWeek/biggestRiskToWatch strings), sectorRotation (array), macroConditions (array), earningsPlays (array of 3-5 objects with ticker/company/reportDate/reportTime/setup/conviction/trade/bullCase/bearCase/keyLevels/expectedMove).`;

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

    // Update archive index -- replace existing entry for same date+edition, don't duplicate
    try {
      const indexRaw = await store.get("archive-index");
      const index: any[] = indexRaw ? JSON.parse(indexRaw) : [];
      const filtered = index.filter((e: any) => !(e.date === todayKey && e.edition === editionKey));
      const timeStr = now.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: "America/Chicago" });
      filtered.unshift({
        date: todayKey,
        edition: editionKey,
        editionLabel: edition,
        generatedAt: now.toISOString(),
        timeLabel: timeStr,
      });
      // Keep last 120 entries (roughly 30 days x 4 editions)
      await store.set("archive-index", JSON.stringify(filtered.slice(0, 120)));
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
