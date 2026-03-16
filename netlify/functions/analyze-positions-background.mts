import type { Context } from "@netlify/functions";
import { getStore } from "@netlify/blobs";

// Background function: returns 202 immediately, gets 15-minute timeout.
// Takes parsed positions, fetches live market data, calls Claude for analysis.

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
    return `${name}: unavailable`;
  }
}

const SYSTEM_PROMPT = `You are the chief portfolio strategist at a top-tier options-focused hedge fund. You review client portfolios against live market conditions and give brutally direct, actionable recommendations. You are numerically precise and never hedge or equivocate.

ANALYSIS RULES:
- Review EVERY position and assign an action: BUY, ADD, HOLD, ADJUST, TRIM, CLOSE, or HEDGE
- Every recommendation must cite specific numbers (price levels, P&L, Greeks, DTE)
- For options: check if theta decay is working for/against, if position is in profit zone, if expiry is approaching
- For equities: check trend vs position direction, support/resistance levels, sector strength
- Factor in current VIX level and IV environment for options recommendations
- Flag any concentrated risk (>20% of portfolio in one name)
- Identify missing hedges or unbalanced Greeks
- Suggest 3-5 "Best Plays for Today" - new trades that complement the existing portfolio

OUTPUT FORMAT:
Output ONLY valid JSON (no markdown fences) with these keys:
- portfolioSummary: 2-3 sentence assessment of overall portfolio health, balance, and risk profile
- riskAssessment: 2-3 sentences on key risks, concentration, missing hedges, Greeks exposure
- marketContext: 2-3 sentences on current market conditions relevant to these positions
- positions: array of objects, ONE per position in the input, each with: symbol, type ("equity"/"option"), action ("BUY"/"ADD"/"HOLD"/"ADJUST"/"TRIM"/"CLOSE"/"HEDGE"), rationale (1-2 sentences WHY), urgency ("immediate"/"this-week"/"monitor"), targetPrice (for exits/adjustments)
- bestPlays: array of 3-5 objects with: strategy (e.g. "Iron Condor", "Put Credit Spread", "Covered Call"), trade (exact strikes/DTE like "Sell NVDA 170/165 put spread, 21 DTE, ~$1.50 credit"), rationale (why this trade NOW given portfolio + market), risk (max loss), conviction ("HIGH"/"MEDIUM"/"LOW")`;

export default async function handler(req: Request, _context: Context) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error("ANTHROPIC_API_KEY not set");
    return;
  }

  const store = getStore("analysis");
  const now = new Date();

  try {
    const body = await req.json();
    const { positions, portfolioSummary, totalNlv, totalPnl } = body;

    if (!positions || !Array.isArray(positions) || positions.length === 0) {
      await store.setJSON("analysis-status", { status: "error", error: "No positions provided", at: now.toISOString() });
      return;
    }

    // Mark as in-progress
    await store.setJSON("analysis-status", { status: "analyzing", startedAt: now.toISOString() });

    // Fetch live market data
    console.log("Fetching market data for position analysis...");
    const marketSymbols = [
      { yahoo: "%5EGSPC", name: "S&P 500" },
      { yahoo: "%5EVIX", name: "VIX" },
      { yahoo: "SPY", name: "SPY" },
      { yahoo: "QQQ", name: "QQQ" },
      { yahoo: "IWM", name: "IWM" },
    ];

    // Also fetch quotes for underlying symbols in the portfolio
    const uniqueSymbols = [...new Set(
      positions
        .map((p: any) => p.underlying || p.symbol)
        .filter((s: string) => s && s.length <= 5 && !s.includes(" "))
    )];
    const portfolioSymbols = uniqueSymbols.slice(0, 15).map((s: string) => ({ yahoo: s, name: s }));

    const allSymbols = [...marketSymbols, ...portfolioSymbols];
    const marketResults = await Promise.all(allSymbols.map(s => fetchYahooSymbol(s.yahoo, s.name)));
    const marketData = marketResults.join("\n");
    console.log("Market data fetched, calling Claude for analysis...");

    // Format positions for Claude
    const positionText = positions.map((p: any) => {
      if (p.type === "option") {
        return `[${p.account}] OPTION: ${p.symbol} | qty: ${p.quantity} | avg: $${p.avgCost} | mark: $${p.mark} | P&L: $${p.openPnl}`;
      }
      return `[${p.account}] EQUITY: ${p.symbol} | qty: ${p.quantity} | avg: $${p.avgCost} | mark: $${p.mark} | P&L: $${p.openPnl} (${p.openPnlPct ?? "?"}%)`;
    }).join("\n");

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
          content: `Analyze this portfolio as of ${dateStr}.

PORTFOLIO OVERVIEW:
${portfolioSummary}
Total NLV: $${totalNlv}
Total Open P&L: $${totalPnl}

POSITIONS:
${positionText}

LIVE MARKET DATA:
${marketData}

Review every position. Recommend action for each. Suggest best new plays. Output ONLY valid JSON.`,
        }],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("Claude API error:", response.status, errText);
      await store.setJSON("analysis-status", { status: "error", error: `Claude API ${response.status}`, at: now.toISOString() });
      return;
    }

    const result = await response.json();
    const content = result.content?.[0]?.text;
    if (!content) {
      console.error("No content from Claude");
      await store.setJSON("analysis-status", { status: "error", error: "No content from Claude", at: now.toISOString() });
      return;
    }

    let analysis: any;
    try {
      const cleaned = content.replace(/^```json?\s*\n?/m, "").replace(/\n?```\s*$/m, "");
      analysis = JSON.parse(cleaned);
    } catch {
      console.error("JSON parse failed:", content.substring(0, 500));
      await store.setJSON("analysis-status", { status: "error", error: "JSON parse failed", at: now.toISOString() });
      return;
    }

    // Store analysis result
    analysis._meta = { analyzedAt: now.toISOString(), model: "claude-sonnet-4-20250514" };
    await store.setJSON("latest", analysis);
    await store.setJSON("analysis-status", { status: "ready", completedAt: now.toISOString() });
    console.log("Position analysis complete and stored.");

  } catch (err) {
    console.error("Analysis error:", err);
    await store.setJSON("analysis-status", { status: "error", error: String(err), at: now.toISOString() });
  }
}
